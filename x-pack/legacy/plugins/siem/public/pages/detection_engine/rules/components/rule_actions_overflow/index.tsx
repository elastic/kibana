/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
  EuiToolTip,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';

import { noop } from 'lodash/fp';
import { useHistory } from 'react-router-dom';
import { Rule } from '../../../../../containers/detection_engine/rules';
import * as i18n from './translations';
import * as i18nActions from '../../../rules/translations';
import { displaySuccessToast, useStateToaster } from '../../../../../components/toasters';
import { deleteRulesAction, duplicateRulesAction } from '../../all/actions';
import { RuleDownloader } from '../rule_downloader';
import { DETECTION_ENGINE_PAGE_NAME } from '../../../../../components/link_to/redirect_to_detection_engine';

const MyEuiButtonIcon = styled(EuiButtonIcon)`
  &.euiButtonIcon {
    svg {
      transform: rotate(90deg);
    }
    border: 1px solid  ${({ theme }) => theme.euiColorPrimary};
    width: 40px;
    height: 40px;
  }
`;

interface RuleActionsOverflowComponentProps {
  rule: Rule | null;
  userHasNoPermissions: boolean;
}

/**
 * Overflow Actions for a Rule
 */
const RuleActionsOverflowComponent = ({
  rule,
  userHasNoPermissions,
}: RuleActionsOverflowComponentProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [rulesToExport, setRulesToExport] = useState<string[]>([]);
  const history = useHistory();
  const [, dispatchToaster] = useStateToaster();

  const onRuleDeletedCallback = useCallback(() => {
    history.push(`/${DETECTION_ENGINE_PAGE_NAME}/rules`);
  }, [history]);

  const actions = useMemo(
    () =>
      rule != null
        ? [
            <EuiContextMenuItem
              key={i18nActions.DUPLICATE_RULE}
              icon="exportAction"
              disabled={userHasNoPermissions}
              onClick={async () => {
                setIsPopoverOpen(false);
                await duplicateRulesAction([rule], [rule.id], noop, dispatchToaster);
              }}
            >
              {i18nActions.DUPLICATE_RULE}
            </EuiContextMenuItem>,
            <EuiContextMenuItem
              key={i18nActions.EXPORT_RULE}
              icon="indexEdit"
              disabled={userHasNoPermissions || rule.immutable}
              onClick={() => {
                setIsPopoverOpen(false);
                setRulesToExport([rule.id]);
              }}
            >
              {i18nActions.EXPORT_RULE}
            </EuiContextMenuItem>,
            <EuiContextMenuItem
              key={i18nActions.DELETE_RULE}
              icon="trash"
              disabled={userHasNoPermissions}
              onClick={async () => {
                setIsPopoverOpen(false);
                await deleteRulesAction([rule.id], noop, dispatchToaster, onRuleDeletedCallback);
              }}
            >
              {i18nActions.DELETE_RULE}
            </EuiContextMenuItem>,
          ]
        : [],
    [rule, userHasNoPermissions]
  );

  const handlePopoverOpen = useCallback(() => {
    setIsPopoverOpen(!isPopoverOpen);
  }, [setIsPopoverOpen, isPopoverOpen]);

  const button = useMemo(
    () => (
      <EuiToolTip position="top" content={i18n.ALL_ACTIONS}>
        <MyEuiButtonIcon
          iconType="boxesHorizontal"
          aria-label={i18n.ALL_ACTIONS}
          isDisabled={userHasNoPermissions}
          onClick={handlePopoverOpen}
        />
      </EuiToolTip>
    ),
    [handlePopoverOpen, userHasNoPermissions]
  );

  return (
    <>
      <EuiPopover
        anchorPosition="leftCenter"
        button={button}
        closePopover={() => setIsPopoverOpen(false)}
        id="ruleActionsOverflow"
        isOpen={isPopoverOpen}
        ownFocus={true}
        panelPaddingSize="none"
      >
        <EuiContextMenuPanel items={actions} />
      </EuiPopover>
      <RuleDownloader
        filename={`${i18nActions.EXPORT_FILENAME}.ndjson`}
        ruleIds={rulesToExport}
        onExportComplete={exportCount => {
          displaySuccessToast(
            i18nActions.SUCCESSFULLY_EXPORTED_RULES(exportCount),
            dispatchToaster
          );
        }}
      />
    </>
  );
};

export const RuleActionsOverflow = React.memo(RuleActionsOverflowComponent);

RuleActionsOverflow.displayName = 'RuleActionsOverflow';
