/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSelectableProps } from '@elastic/eui';
import {
  EuiButton,
  EuiCard,
  EuiEmptyPrompt,
  EuiFacetButton,
  EuiFacetGroup,
  EuiFieldSearch,
  EuiFilterButton,
  EuiFilterGroup,
  EuiPopover,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  useEuiTheme,
  EuiSelectable,
  useCurrentEuiBreakpoint,
  EuiBetaBadge,
  EuiIconTip,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { ActionConnector } from '@kbn/alerts-ui-shared';
import { checkActionFormActionTypeEnabled } from '@kbn/alerts-ui-shared';
import { i18n } from '@kbn/i18n';
import { ACTION_TYPE_SOURCES } from '@kbn/actions-types';
import React, { Suspense, useCallback, useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { RuleFormParamsErrors } from '../common/types';
import { DEFAULT_FREQUENCY } from '../constants';
import { useRuleFormDispatch, useRuleFormState } from '../hooks';
import {
  ACTION_TYPE_MODAL_EMPTY_TEXT,
  ACTION_TYPE_MODAL_EMPTY_TITLE,
  ACTION_TYPE_MODAL_FILTER_ALL,
  ACTION_TYPE_MODAL_FILTER_LIST_TITLE,
  MODAL_SEARCH_CLEAR_FILTERS_TEXT,
  MODAL_SEARCH_PLACEHOLDER,
  DEPRECATED_LABEL,
  DEPRECATED_CONNECTOR_TOOLTIP_CONTENT,
  DEPRECATED_LLM_CONNECTOR_INFO,
} from '../translations';
import { isLLMConnectorTypeId } from '../constants';
import { getDefaultParams } from '../utils';

type ConnectorsMap = Record<string, { actionTypeId: string; name: string; total: number }>;

export interface RuleActionsConnectorsBodyProps {
  onSelectConnector: (connector?: ActionConnector) => void;
  responsiveOverflow?: 'auto' | 'hidden';
}

export const RuleActionsConnectorsBody = ({
  onSelectConnector,
  responsiveOverflow = 'auto',
}: RuleActionsConnectorsBodyProps) => {
  const [searchValue, setSearchValue] = useState<string>('');
  const [selectedConnectorType, setSelectedConnectorType] = useState<string>('all');
  const [isConenctorFilterPopoverOpen, setIsConenctorFilterPopoverOpen] = useState<boolean>(false);

  const { euiTheme } = useEuiTheme();

  const currentBreakpoint = useCurrentEuiBreakpoint() ?? 'm';

  const containerCss = css`
    .showForContainer--s,
    showForContainer--xs {
      display: none;
    }

    @container (max-width: 767px) and (min-width: 575px) {
      .hideForContainer--s {
        display: none;
      }

      .showForContainer--s {
        display: initial !important;
      }
    }
    @container (max-width: 574px) {
      .hideForContainer--xs {
        display: none;
      }

      .showForContainer--xs {
        display: initial !important;
      }
    }
  `;

  const {
    plugins: { actionTypeRegistry },
    formData: { actions },
    connectors,
    connectorTypes,
    selectedRuleType,
  } = useRuleFormState();

  const dispatch = useRuleFormDispatch();

  const onSelectConnectorInternal = useCallback(
    async (connector: ActionConnector) => {
      const { id, actionTypeId } = connector;
      const uuid = uuidv4();
      const group = selectedRuleType.defaultActionGroupId;
      const connectorConfig = 'config' in connector ? connector.config : undefined;
      const actionTypeModel = actionTypeRegistry.has(actionTypeId)
        ? actionTypeRegistry.get(actionTypeId)
        : undefined;

      const params = actionTypeModel
        ? getDefaultParams({ group, ruleType: selectedRuleType, actionTypeModel }) || {}
        : {};

      dispatch({
        type: 'addAction',
        payload: {
          id,
          actionTypeId,
          uuid,
          params,
          group,
          frequency: DEFAULT_FREQUENCY,
        },
      });

      // Spec-backed connectors handle validation server-side; skip client validateParams.
      const res: { errors: RuleFormParamsErrors } = actionTypeModel
        ? await actionTypeModel.validateParams(params, connectorConfig)
        : { errors: {} };

      dispatch({
        type: 'setActionParamsError',
        payload: {
          uuid,
          errors: res.errors,
        },
      });

      // Send connector to onSelectConnector mainly for testing purposes, dispatch handles form data updates
      onSelectConnector(connector);
    },
    [dispatch, onSelectConnector, selectedRuleType, actionTypeRegistry]
  );

  const preconfiguredConnectors = useMemo(() => {
    return connectors.filter((connector) => connector.isPreconfigured);
  }, [connectors]);

  const availableConnectors = useMemo(() => {
    return connectors.filter(({ actionTypeId }) => {
      const actionType = connectorTypes.find(({ id }) => id === actionTypeId);

      if (!actionType) {
        return false;
      }

      const checkEnabledResult = checkActionFormActionTypeEnabled(
        actionType,
        preconfiguredConnectors
      );

      if (!actionType.enabledInConfig && !checkEnabledResult.isEnabled) {
        return false;
      }

      // Spec-backed connectors are shown without a registry model
      if (actionType.source === ACTION_TYPE_SOURCES.spec) {
        return true;
      }

      if (!actionTypeRegistry.has(actionTypeId)) {
        return false;
      }

      const actionTypeModel = actionTypeRegistry.get(actionTypeId);

      if (!actionTypeModel?.actionParamsFields) {
        return false;
      }

      return true;
    });
  }, [connectors, connectorTypes, preconfiguredConnectors, actionTypeRegistry]);

  const onSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
  }, []);

  const onConnectorOptionSelect = useCallback(
    (id: string) => () => {
      setSelectedConnectorType((prev) => {
        if (prev === id) {
          return 'all';
        }
        return id;
      });
    },
    []
  );

  const onClearFilters = useCallback(() => {
    setSearchValue('');
    setSelectedConnectorType('all');
  }, []);

  const connectorsMap: ConnectorsMap | null = useMemo(() => {
    return availableConnectors.reduce<ConnectorsMap>((result, { actionTypeId }) => {
      if (!actionTypeRegistry.has(actionTypeId)) {
        return result;
      }
      const actionTypeModel = actionTypeRegistry.get(actionTypeId);
      const subtype = actionTypeModel.subtype;

      const shownActionTypeId =
        actionTypeModel.getHideInUi != null && actionTypeModel.getHideInUi(connectorTypes)
          ? subtype?.filter((type) => type.id !== actionTypeId)[0].id
          : undefined;

      const currentActionTypeId = shownActionTypeId ? shownActionTypeId : actionTypeId;

      if (result[currentActionTypeId]) {
        result[currentActionTypeId].total += 1;
      } else {
        result[currentActionTypeId] = {
          actionTypeId: currentActionTypeId,
          total: 1,
          name: connectorTypes.find(({ id }) => id === currentActionTypeId)?.name || '',
        };
      }

      return result;
    }, {});
  }, [availableConnectors, connectorTypes, actionTypeRegistry]);

  const filteredConnectors = useMemo(() => {
    return availableConnectors
      .filter(({ actionTypeId }) => {
        if (!actionTypeRegistry.has(actionTypeId)) {
          return true;
        }
        const subtype = actionTypeRegistry.get(actionTypeId).subtype?.map((type) => type.id);

        if (selectedConnectorType === 'all' || selectedConnectorType === '') {
          return true;
        }

        if (subtype?.includes(selectedConnectorType)) {
          return subtype.includes(actionTypeId);
        }

        return selectedConnectorType === actionTypeId;
      })
      .filter(({ actionTypeId, name }) => {
        const trimmedSearchValue = searchValue.trim().toLocaleLowerCase();
        if (trimmedSearchValue === '') {
          return true;
        }
        if (!actionTypeRegistry.has(actionTypeId)) {
          return true;
        }
        const actionTypeModel = actionTypeRegistry.get(actionTypeId);
        const actionType = connectorTypes.find(({ id }) => id === actionTypeId);
        const textSearchTargets = [
          name.toLocaleLowerCase(),
          actionTypeModel.selectMessage?.toLocaleLowerCase(),
          actionTypeModel.actionTypeTitle?.toLocaleLowerCase(),
          actionType?.name?.toLocaleLowerCase(),
        ];
        return textSearchTargets.some((text) => text?.includes(trimmedSearchValue));
      });
  }, [availableConnectors, selectedConnectorType, searchValue, connectorTypes, actionTypeRegistry]);

  const connectorFacetButtons = useMemo(() => {
    return (
      <EuiFacetGroup
        data-test-subj="ruleActionsConnectorsModalFilterButtonGroup"
        style={{ overflow: 'auto' }}
      >
        <EuiFacetButton
          data-test-subj="ruleActionsConnectorsModalFilterButton"
          key="all"
          quantity={Object.values(connectorsMap).reduce((sum, { total }) => sum + total, 0)}
          isSelected={selectedConnectorType === 'all'}
          onClick={onConnectorOptionSelect('all')}
        >
          {ACTION_TYPE_MODAL_FILTER_ALL}
        </EuiFacetButton>
        {Object.values(connectorsMap)
          .sort((a, b) => a.name.localeCompare(b.name))
          .map(({ actionTypeId, name, total }) => {
            return (
              <EuiFacetButton
                data-test-subj="ruleActionsConnectorsModalFilterButton"
                key={actionTypeId}
                quantity={total}
                isSelected={selectedConnectorType === actionTypeId}
                onClick={onConnectorOptionSelect(actionTypeId)}
              >
                {name}
              </EuiFacetButton>
            );
          })}
      </EuiFacetGroup>
    );
  }, [connectorsMap, selectedConnectorType, onConnectorOptionSelect]);

  const toggleFilterPopover = useCallback(() => {
    setIsConenctorFilterPopoverOpen((prev) => !prev);
  }, []);
  const closeFilterPopover = useCallback(() => {
    setIsConenctorFilterPopoverOpen(false);
  }, []);
  const connectorFilterButton = useMemo(() => {
    const button = (
      <EuiFilterButton
        iconType="chevronSingleDown"
        badgeColor="accent"
        hasActiveFilters={selectedConnectorType !== 'all'}
        numActiveFilters={selectedConnectorType !== 'all' ? 1 : undefined}
        onClick={toggleFilterPopover}
        isSelected={isConenctorFilterPopoverOpen}
      >
        {ACTION_TYPE_MODAL_FILTER_LIST_TITLE}
      </EuiFilterButton>
    );

    const options: EuiSelectableProps['options'] = Object.values(connectorsMap)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(({ actionTypeId, name }) => ({
        label: name,
        checked: selectedConnectorType === actionTypeId ? 'on' : undefined,
        onClick: onConnectorOptionSelect(actionTypeId),
      }));

    return (
      <EuiFilterGroup style={{ width: '100%' }}>
        <EuiPopover
          aria-label={i18n.translate(
            'responseOpsRuleForm.ruleForm.connectorTypeFilterPopoverAriaLabel',
            { defaultMessage: 'Filter by connector type' }
          )}
          button={button}
          closePopover={closeFilterPopover}
          isOpen={isConenctorFilterPopoverOpen}
          panelPaddingSize="none"
        >
          <EuiSelectable singleSelection options={options}>
            {(list) => <div style={{ width: 400 }}>{list}</div>}
          </EuiSelectable>
        </EuiPopover>
      </EuiFilterGroup>
    );
  }, [
    closeFilterPopover,
    connectorsMap,
    isConenctorFilterPopoverOpen,
    onConnectorOptionSelect,
    toggleFilterPopover,
    selectedConnectorType,
  ]);

  const connectorCards = useMemo(() => {
    if (!filteredConnectors.length) {
      return (
        <EuiEmptyPrompt
          data-test-subj="ruleActionsConnectorsModalEmpty"
          color="subdued"
          iconType="magnify"
          title={<h2>{ACTION_TYPE_MODAL_EMPTY_TITLE}</h2>}
          body={
            <EuiText>
              <p>{ACTION_TYPE_MODAL_EMPTY_TEXT}</p>
            </EuiText>
          }
          actions={
            <EuiButton
              data-test-subj="ruleActionsConnectorsModalClearFiltersButton"
              size="s"
              color="primary"
              fill
              onClick={onClearFilters}
            >
              {MODAL_SEARCH_CLEAR_FILTERS_TEXT}
            </EuiButton>
          }
        />
      );
    }
    return (
      <EuiFlexGroup direction="column">
        {filteredConnectors.map((connector) => {
          const { id, actionTypeId, name } = connector;
          const actionType = connectorTypes.find((item) => item.id === actionTypeId);

          if (!actionType) {
            return null;
          }

          const actionTypeModel = actionTypeRegistry.has(actionTypeId)
            ? actionTypeRegistry.get(actionTypeId)
            : undefined;

          // For non-spec connectors without a registry model, skip rendering
          if (!actionTypeModel && actionType.source !== ACTION_TYPE_SOURCES.spec) {
            return null;
          }

          const iconClass = actionTypeModel?.iconClass ?? 'plugs';
          const selectMessage = actionTypeModel?.selectMessage ?? actionType.description ?? '';

          const checkEnabledResult = checkActionFormActionTypeEnabled(
            actionType,
            preconfiguredConnectors
          );

          const isSystemActionsSelected = Boolean(
            actionType.isSystemActionType &&
              actions.find((action) => action.actionTypeId === actionTypeId)
          );

          const shouldDisableSystemAction =
            isSystemActionsSelected && !Boolean(actionType.allowMultipleSystemActions);

          const isDisabled = !checkEnabledResult.isEnabled || shouldDisableSystemAction;

          const connectorCard = (
            <EuiCard
              data-test-subj="ruleActionsConnectorsModalCard"
              data-action-type-id={actionTypeId}
              hasBorder
              isDisabled={isDisabled}
              titleSize="xs"
              layout="horizontal"
              icon={
                <div style={{ marginInlineEnd: `16px` }}>
                  <Suspense fallback={<EuiLoadingSpinner />}>
                    <EuiIcon size="l" type={iconClass} />
                  </Suspense>
                </div>
              }
              title={name}
              description={
                <>
                  <EuiText size="xs">{selectMessage}</EuiText>
                  <EuiSpacer size="s" />
                  <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
                    {actionType.isDeprecated && (
                      <EuiFlexItem grow={false} style={{ height: `1.5rem` }}>
                        <EuiBetaBadge
                          color="warning"
                          label={DEPRECATED_LABEL}
                          size="s"
                          tooltipContent={DEPRECATED_CONNECTOR_TOOLTIP_CONTENT}
                        />
                      </EuiFlexItem>
                    )}
                    {actionType.isDeprecated && isLLMConnectorTypeId(actionType.id) && (
                      <EuiFlexItem grow={false}>
                        <EuiIconTip
                          type="info"
                          color="subdued"
                          content={DEPRECATED_LLM_CONNECTOR_INFO}
                          data-test-subj={`deprecatedLLMConnectorInfo-${actionType.id}`}
                        />
                      </EuiFlexItem>
                    )}
                    <EuiText color="subdued" size="xs" style={{ textTransform: 'uppercase' }}>
                      <strong>{actionType?.name}</strong>
                    </EuiText>
                  </EuiFlexGroup>
                </>
              }
              onClick={() => onSelectConnectorInternal(connector)}
            />
          );

          return (
            <EuiFlexItem key={id} grow={false}>
              {checkEnabledResult.isEnabled && connectorCard}
              {!checkEnabledResult.isEnabled && (
                <EuiToolTip position="top" content={checkEnabledResult.message}>
                  {connectorCard}
                </EuiToolTip>
              )}
            </EuiFlexItem>
          );
        })}
      </EuiFlexGroup>
    );
  }, [
    actions,
    preconfiguredConnectors,
    filteredConnectors,
    actionTypeRegistry,
    connectorTypes,
    onSelectConnectorInternal,
    onClearFilters,
  ]);

  return (
    <>
      <EuiFlexGroup
        direction="column"
        style={{ overflow: responsiveOverflow, height: '100%' }}
        css={containerCss}
      >
        <EuiFlexItem grow={false}>
          <EuiFlexGroup direction="column">
            <EuiFlexGroup gutterSize="s" wrap={false} responsive={false}>
              <EuiFlexItem grow={3}>
                <EuiFieldSearch
                  fullWidth={
                    /* TODO Determine this using @container breakpoints once we have a better helper function for
                     * determining the size of a CSS @container. This works in practice because when the action connector
                     * UI is displayed in a modal, a screen breakpoint of 'm' is equivalent to a container breakpoint of 's',
                     * but we should replace this with a more robust solution in the future. This may not be very easy until
                     * https://github.com/w3c/csswg-drafts/issues/6205 is resolved, but we could theoretically hack something
                     * together using showForContainer classes and React refs.
                     */
                    ['m', 's', 'xs'].includes(currentBreakpoint)
                  }
                  data-test-subj="ruleActionsConnectorsModalSearch"
                  placeholder={MODAL_SEARCH_PLACEHOLDER}
                  value={searchValue}
                  onChange={onSearchChange}
                />
              </EuiFlexItem>
              <EuiFlexItem className="showForContainer--s showForContainer--xs">
                {connectorFilterButton}
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiHorizontalRule margin="none" />
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem style={{ overflow: responsiveOverflow }}>
          <EuiFlexGroup style={{ overflow: responsiveOverflow }}>
            <EuiFlexItem className="hideForContainer--s hideForContainer--xs" grow={1}>
              {connectorFacetButtons}
            </EuiFlexItem>
            <EuiFlexItem
              grow={3}
              style={{
                overflow: 'auto',
                width: '100%',
                padding: `${euiTheme.size.base} ${euiTheme.size.base} ${euiTheme.size.xl}`,
              }}
            >
              {connectorCards}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
