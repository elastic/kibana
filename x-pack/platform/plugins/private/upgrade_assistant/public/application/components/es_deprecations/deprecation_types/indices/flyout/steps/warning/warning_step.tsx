/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  IndexWarning,
  IndexWarningType,
  ReindexStatusResponse,
} from '../../../../../../../../../common/types';
import { useAppContext } from '../../../../../../../app_context';
import {
  DeprecatedSettingWarningCheckbox,
  ReplaceIndexWithAliasWarningCheckbox,
  MakeIndexReadonlyWarningCheckbox,
  WarningCheckboxProps,
} from './warning_step_checkbox';
import { FrozenCallOut } from '../frozen_callout';

interface CheckedIds {
  [id: string]: boolean;
}

const warningToComponentMap: {
  [key in IndexWarningType]: React.FunctionComponent<WarningCheckboxProps>;
} = {
  indexSetting: DeprecatedSettingWarningCheckbox,
  replaceIndexWithAlias: ReplaceIndexWithAliasWarningCheckbox,
  makeIndexReadonly: MakeIndexReadonlyWarningCheckbox,
};

export const idForWarning = (id: number) => `reindexWarning-${id}`;
interface WarningFlyoutStepProps {
  back: () => void;
  confirm: () => void;
  flow: 'readonly' | 'reindex';
  meta: ReindexStatusResponse['meta'];
  warnings: IndexWarning[];
}

/**
 * Displays warning text about destructive changes required to reindex this index. The user
 * must acknowledge each change before being allowed to proceed.
 */
export const WarningFlyoutStep: React.FunctionComponent<WarningFlyoutStepProps> = ({
  back,
  confirm,
  flow,
  meta,
  warnings,
}) => {
  const {
    services: {
      core: { docLinks },
    },
  } = useAppContext();
  const { links } = docLinks;

  const [checkedIds, setCheckedIds] = useState<CheckedIds>(
    warnings.reduce((initialCheckedIds, warning, index) => {
      initialCheckedIds[idForWarning(index)] = false;
      return initialCheckedIds;
    }, {} as { [id: string]: boolean })
  );

  // Do not allow to proceed until all checkboxes are checked.
  const blockAdvance = Object.values(checkedIds).filter((v) => v).length < warnings.length;

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const optionId = e.target.id;

    setCheckedIds((prev) => ({
      ...prev,
      ...{
        [optionId]: !checkedIds[optionId],
      },
    }));
  };

  return (
    <>
      <EuiFlyoutBody>
        {meta.isFrozen && <FrozenCallOut />}
        {warnings.length > 0 && (
          <>
            {flow === 'reindex' && (
              <EuiCallOut
                title={
                  <FormattedMessage
                    id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.warningsStep.reindex.calloutTitle"
                    defaultMessage="This index requires destructive changes that cannot be reversed"
                  />
                }
                color="warning"
                iconType="warning"
              >
                <p>
                  <FormattedMessage
                    id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.warningsStep.reindex.calloutDetail"
                    defaultMessage="Back up the index before continuing. To proceed with the reindex, accept each change."
                  />
                </p>
              </EuiCallOut>
            )}
            {flow === 'readonly' && (
              <EuiCallOut
                title={
                  <FormattedMessage
                    id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.warningsStep.readonly.calloutTitle"
                    defaultMessage="Enable compatibility by marking this index as read-only"
                  />
                }
                color="warning"
                iconType="warning"
              >
                <p>
                  <FormattedMessage
                    id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.warningsStep.readonly.calloutDetail"
                    defaultMessage="You can enable compatibility with the next version by marking the index as read-only. Note that any attempts to insert new documents or update existing ones will fail. You can choose to reindex after upgrading if needed, to convert the index into a writable one."
                  />
                </p>
              </EuiCallOut>
            )}
            <EuiSpacer />

            <EuiTitle size="xs">
              <h3>
                <FormattedMessage
                  id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.warningsStep.acceptChangesTitle"
                  defaultMessage="Accept changes"
                />
              </h3>
            </EuiTitle>
            <EuiSpacer />
            {warnings.map((warning, index) => {
              const WarningCheckbox = warningToComponentMap[warning.warningType];
              return (
                <WarningCheckbox
                  key={idForWarning(index)}
                  isChecked={checkedIds[idForWarning(index)]}
                  onChange={onChange}
                  docLinks={links}
                  id={idForWarning(index)}
                  meta={{ ...meta, ...warning.meta }}
                />
              );
            })}
          </>
        )}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="arrowLeft" onClick={back} flush="left">
              <FormattedMessage
                id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.backButtonLabel"
                defaultMessage="Back"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {flow === 'reindex' && (
              <EuiButton
                fill
                color="primary"
                onClick={confirm}
                disabled={blockAdvance}
                data-test-subj="startReindexingButton"
              >
                <FormattedMessage
                  id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.warningsStep.reindex.continueButtonLabel"
                  defaultMessage="Continue reindexing"
                />
              </EuiButton>
            )}
            {flow === 'readonly' && (
              <EuiButton
                fill
                color="primary"
                onClick={confirm}
                disabled={blockAdvance}
                data-test-subj="startIndexReadonlyButton"
              >
                <FormattedMessage
                  id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.warningsStep.readonly.continueButtonLabel"
                  data-test-subj="startIndexReadonlyButton"
                  defaultMessage="Mark as read-only"
                />
              </EuiButton>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
