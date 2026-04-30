/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { EuiFieldTextProps, EuiSelectableOption } from '@elastic/eui';
import {
  EuiAccordion,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiHorizontalRule,
  EuiInputPopover,
  EuiLink,
  EuiSelect,
  EuiSelectable,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  EuiTitle,
  htmlIdGenerator,
  keys,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';
import type { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public';

import { DATA_SET_FLOW_CONNECTOR_ACTION_TYPE_IDS } from '../common/data_set_flow_connector_allowlist';
import type { DataSourceListItem } from '../common/sample_data_sources_client';
import type { DataSetPartitionDetection } from '../common/sample_data_sets_client';
import { addDataSetFlyoutStrings } from './add_data_set_flyout_i18n';
import { dataSourcePreviewFlyoutStrings } from './data_source_preview_flyout_i18n';
import { useDataSourceManagementAppContext } from './data_source_management_app_context';

export interface AddDataSetFlyoutPayload {
  sourceName: string;
  datasetId: string;
  resource: string;
  description: string;
  partitionDetection: DataSetPartitionDetection;
}

export interface AddDataSetFlyoutProps {
  /** Connectors to show in the source selector. */
  sources: DataSourceListItem[];
  onClose: () => void;
  /** Resolve `null` on success, or an error message to display in the flyout. */
  onSave: (values: AddDataSetFlyoutPayload) => Promise<string | null>;
  /**
   * After a connector is created via the create-connector flyout, register it as a source
   * (e.g. add to the sample catalog) and refresh `sources` from the parent.
   */
  onRegisterConnectorFromFlyout?: (connector: ActionConnector) => Promise<void>;
}

export const AddDataSetFlyout: FunctionComponent<AddDataSetFlyoutProps> = ({
  sources,
  onClose,
  onSave,
  onRegisterConnectorFromFlyout,
}) => {
  const { triggersActionsUi, coreStart } = useDataSourceManagementAppContext();
  const titleId = 'addDataSetFlyoutTitle';
  const [selectedSourceName, setSelectedSourceName] = useState('');
  const [datasetId, setDatasetId] = useState('');
  const [resource, setResource] = useState('');
  const [description, setDescription] = useState('');
  const [partitionDetection, setPartitionDetection] = useState<DataSetPartitionDetection>('none');
  const [sourceError, setSourceError] = useState<string | undefined>();
  const [datasetIdError, setDatasetIdError] = useState<string | undefined>();
  const [resourceError, setResourceError] = useState<string | undefined>();
  const [saveError, setSaveError] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);
  const [createConnectorFlyout, setCreateConnectorFlyout] = useState<React.ReactNode>(null);
  const [isSourcePopoverOpen, setIsSourcePopoverOpen] = useState(false);

  const sourcePopoverPanelId = useMemo(() => htmlIdGenerator('addDataSetSource')(), []);

  useEffect(() => {
    setSelectedSourceName((prev) => {
      if (prev && sources.some((row) => row.name === prev)) {
        return prev;
      }
      return '';
    });
  }, [sources]);

  const sourceSelectableOptions: EuiSelectableOption[] = useMemo(() => {
    const sorted = [...sources].sort((a, b) => a.name.localeCompare(b.name));
    return sorted.map((row) => ({
      key: row.name,
      label: row.name,
      checked: selectedSourceName === row.name ? 'on' : undefined,
      'data-test-subj': `addDataSetFlyoutSourceOption-${row.name}`,
    }));
  }, [sources, selectedSourceName]);

  const connectorsPageUrl = useMemo(
    () => coreStart.application.getUrlForApp('triggersActionsConnectors'),
    [coreStart.application]
  );

  const createConnectorFlyoutMenuHeader = useMemo(
    () => (
      <>
        <EuiText size="s" color="subdued" data-test-subj="addDataSetFlyoutCreateConnectorRestrictedNotice">
          <FormattedMessage
            id="dataSourceManagement.addDataSetFlyout.createConnectorRestrictedListNotice"
            defaultMessage="Only connectors suitable as data set sources are listed. {connectorsPageLink} to create one from the full catalog."
            values={{
              connectorsPageLink: (
                <EuiLink
                  href={connectorsPageUrl}
                  data-test-subj="addDataSetFlyoutCreateConnectorFullCatalogLink"
                >
                  <FormattedMessage
                    id="dataSourceManagement.addDataSetFlyout.createConnectorFullCatalogLink"
                    defaultMessage="Go to the Connectors page"
                  />
                </EuiLink>
              ),
            }}
          />
        </EuiText>
        <EuiSpacer size="l" />
      </>
    ),
    [connectorsPageUrl]
  );

  const openCreateConnectorFlyout = useCallback(() => {
    setCreateConnectorFlyout(
      triggersActionsUi.getAddConnectorFlyout({
        onClose: () => setCreateConnectorFlyout(null),
        onConnectorCreated: async (connector: ActionConnector) => {
          setCreateConnectorFlyout(null);
          try {
            await onRegisterConnectorFromFlyout?.(connector);
            setSelectedSourceName(connector.name);
          } catch {
            // Parent surfaces registration errors (e.g. duplicate name).
          }
        },
        allowedActionTypeIds: [...DATA_SET_FLOW_CONNECTOR_ACTION_TYPE_IDS],
        connectorMenuHeader: createConnectorFlyoutMenuHeader,
      })
    );
  }, [createConnectorFlyoutMenuHeader, onRegisterConnectorFromFlyout, triggersActionsUi]);

  const handleSourceSelectableChange = useCallback((newOptions: EuiSelectableOption[]) => {
    const selected = newOptions.find((o) => o.checked === 'on');
    if (!selected?.key) {
      setSelectedSourceName('');
      return;
    }
    setIsSourcePopoverOpen(false);
    setSelectedSourceName(String(selected.key));
  }, []);

  const toggleSourcePopover = useCallback(() => {
    setIsSourcePopoverOpen((open) => !open);
  }, []);

  const closeSourcePopover = useCallback(() => {
    setIsSourcePopoverOpen(false);
  }, []);

  const onCreateConnectorLinkClick = useCallback(() => {
    closeSourcePopover();
    openCreateConnectorFlyout();
  }, [closeSourcePopover, openCreateConnectorFlyout]);

  const onSourceTriggerKeyDown = useCallback<NonNullable<EuiFieldTextProps['onKeyDown']>>(
    (event) => {
      if (event.key === keys.ENTER || event.key === keys.SPACE) {
        event.preventDefault();
        setIsSourcePopoverOpen(true);
      }
    },
    []
  );

  const partitionOptions = useMemo(
    () => [
      { value: 'none', text: addDataSetFlyoutStrings.partitionOptionNone() },
      { value: 'hive', text: addDataSetFlyoutStrings.partitionOptionHive() },
    ],
    []
  );

  const handleSave = useCallback(async () => {
    const trimmedId = datasetId.trim();
    const trimmedResource = resource.trim();
    const trimmedSource = selectedSourceName.trim();
    setSourceError(undefined);
    setDatasetIdError(undefined);
    setResourceError(undefined);
    setSaveError(undefined);

    if (!trimmedSource) {
      setSourceError(addDataSetFlyoutStrings.sourceRequired());
      return;
    }
    if (!sources.some((row) => row.name === trimmedSource)) {
      setSourceError(addDataSetFlyoutStrings.sourceRequired());
      return;
    }
    if (!trimmedId) {
      setDatasetIdError(addDataSetFlyoutStrings.datasetIdRequired());
      return;
    }
    if (!trimmedResource) {
      setResourceError(addDataSetFlyoutStrings.resourceRequired());
      return;
    }

    setIsSaving(true);
    try {
      const message = await onSave({
        sourceName: trimmedSource,
        datasetId: trimmedId,
        resource: trimmedResource,
        description: description.trim(),
        partitionDetection,
      });
      if (message) {
        setSaveError(message);
      }
    } finally {
      setIsSaving(false);
    }
  }, [
    datasetId,
    description,
    onSave,
    partitionDetection,
    resource,
    selectedSourceName,
    sources,
  ]);

  const hasSources = sources.length > 0;
  const hasValidSelectedSource = Boolean(
    selectedSourceName && sources.some((row) => row.name === selectedSourceName)
  );
  const saveDisabled = isSaving || !hasValidSelectedSource;
  const sourceTriggerDisplay = hasValidSelectedSource ? selectedSourceName : '';

  return (
    <>
      <EuiFlyout
        ownFocus
        onClose={onClose}
        aria-labelledby={titleId}
        size="m"
        data-test-subj="addDataSetFlyout"
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2 id={titleId}>{addDataSetFlyoutStrings.title()}</h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <EuiForm component="form" id="addDataSetForm" onSubmit={(e) => e.preventDefault()}>
            {!hasSources ? (
              <>
                <EuiCallOut
                  title={addDataSetFlyoutStrings.noSourcesCallout()}
                  color="warning"
                  data-test-subj="addDataSetFlyoutNoSources"
                />
                <EuiSpacer size="m" />
              </>
            ) : null}
            {saveError ? (
              <>
                <EuiText color="danger" size="s" data-test-subj="addDataSetFlyoutSaveError">
                  {saveError}
                </EuiText>
                <EuiSpacer size="m" />
              </>
            ) : null}
            <EuiFormRow
              label={addDataSetFlyoutStrings.sourceLabel()}
              isInvalid={Boolean(sourceError)}
              error={sourceError}
              fullWidth
            >
              <EuiInputPopover
                id={sourcePopoverPanelId}
                fullWidth
                input={
                  <EuiFieldText
                    fullWidth
                    isInvalid={Boolean(sourceError)}
                    value={sourceTriggerDisplay}
                    placeholder={addDataSetFlyoutStrings.selectSourcePlaceholder()}
                    onClick={toggleSourcePopover}
                    onChange={() => {}}
                    onKeyDown={onSourceTriggerKeyDown}
                    icon={{ type: 'chevronSingleDown', side: 'right' }}
                    autoComplete="off"
                    aria-label={addDataSetFlyoutStrings.sourceLabel()}
                    aria-expanded={isSourcePopoverOpen}
                    aria-controls={sourcePopoverPanelId}
                    role="combobox"
                    data-test-subj="addDataSetFlyoutSource"
                  />
                }
                isOpen={isSourcePopoverOpen}
                closePopover={closeSourcePopover}
                panelPaddingSize="s"
                panelMinWidth={360}
                anchorPosition="downLeft"
              >
                <EuiSelectable
                  searchable
                  singleSelection
                  options={sourceSelectableOptions}
                  onChange={handleSourceSelectableChange}
                  aria-label={addDataSetFlyoutStrings.sourceLabel()}
                  data-test-subj="addDataSetFlyoutSourceList"
                  noMatchesMessage={addDataSetFlyoutStrings.sourceNoMatches()}
                  searchProps={{
                    'data-test-subj': 'addDataSetFlyoutSourceSearch',
                    placeholder: addDataSetFlyoutStrings.sourceSearchPlaceholder(),
                    autoFocus: true,
                  }}
                  listProps={{
                    activeOptionIndex: undefined,
                    isVirtualized: false,
                  }}
                >
                  {(list, search) => (
                    <>
                      {search}
                      <EuiSpacer size="xs" />
                      {list}
                      <EuiHorizontalRule margin="s" />
                      <EuiText size="s" textAlign="center">
                        <EuiLink
                          data-test-subj="addDataSetFlyoutSourceCreateNewLink"
                          onClick={onCreateConnectorLinkClick}
                        >
                          {addDataSetFlyoutStrings.createNewConnectorOption()}
                        </EuiLink>
                      </EuiText>
                    </>
                  )}
                </EuiSelectable>
              </EuiInputPopover>
            </EuiFormRow>
            <EuiFormRow
              label={addDataSetFlyoutStrings.datasetIdLabel()}
              helpText={addDataSetFlyoutStrings.datasetIdHelp()}
              isInvalid={Boolean(datasetIdError)}
              error={datasetIdError}
              fullWidth
            >
              <EuiFieldText
                name="datasetId"
                value={datasetId}
                onChange={(e) => setDatasetId(e.target.value)}
                isInvalid={Boolean(datasetIdError)}
                data-test-subj="addDataSetFlyoutDatasetId"
                fullWidth
                aria-label={addDataSetFlyoutStrings.datasetIdLabel()}
              />
            </EuiFormRow>
            <EuiFormRow
              label={addDataSetFlyoutStrings.resourceLabel()}
              helpText={addDataSetFlyoutStrings.resourceHelp()}
              isInvalid={Boolean(resourceError)}
              error={resourceError}
              fullWidth
            >
              <EuiTextArea
                name="resource"
                value={resource}
                onChange={(e) => setResource(e.target.value)}
                isInvalid={Boolean(resourceError)}
                data-test-subj="addDataSetFlyoutResource"
                fullWidth
                rows={4}
                aria-label={addDataSetFlyoutStrings.resourceLabel()}
              />
            </EuiFormRow>
            <EuiFormRow
              label={addDataSetFlyoutStrings.descriptionLabel()}
              helpText={addDataSetFlyoutStrings.descriptionHelp()}
              fullWidth
            >
              <EuiTextArea
                name="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                data-test-subj="addDataSetFlyoutDescription"
                fullWidth
                rows={3}
                aria-label={addDataSetFlyoutStrings.descriptionLabel()}
              />
            </EuiFormRow>
            <EuiSpacer size="m" />
            <EuiAccordion
              id="addDataSetAdvancedSettings"
              buttonContent={addDataSetFlyoutStrings.settingsPanelTitle()}
              paddingSize="m"
              data-test-subj="addDataSetFlyoutAdvancedSettings"
            >
              <EuiFormRow
                label={addDataSetFlyoutStrings.partitionDetectionLabel()}
                helpText={addDataSetFlyoutStrings.partitionDetectionHelp()}
                fullWidth
              >
                <EuiSelect
                  options={partitionOptions}
                  value={partitionDetection}
                  onChange={(e) =>
                    setPartitionDetection(e.target.value as DataSetPartitionDetection)
                  }
                  data-test-subj="addDataSetFlyoutPartitionDetection"
                  aria-label={addDataSetFlyoutStrings.partitionDetectionLabel()}
                />
              </EuiFormRow>
            </EuiAccordion>
          </EuiForm>
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty flush="left" data-test-subj="addDataSetFlyoutClose" onClick={onClose}>
                {dataSourcePreviewFlyoutStrings.closeButton()}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                type="button"
                data-test-subj="addDataSetFlyoutSave"
                onClick={() => void handleSave()}
                isLoading={isSaving}
                disabled={saveDisabled}
              >
                {addDataSetFlyoutStrings.saveButton()}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
      {createConnectorFlyout}
    </>
  );
};
