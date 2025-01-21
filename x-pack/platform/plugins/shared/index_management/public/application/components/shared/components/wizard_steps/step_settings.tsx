/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiButtonEmpty,
  EuiSpacer,
  EuiFormRow,
  EuiText,
  EuiCode,
  EuiCallOut,
  EuiLink,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { CodeEditor } from '@kbn/code-editor';

import { Forms } from '../../../../../shared_imports';
import { useJsonStep } from './use_json_step';
import { documentationService } from '../../../mappings_editor/shared_imports';
import { indexModeLabels } from '../../../../lib/index_mode_labels';
import { IndexMode } from '../../../../../../common/types';

interface Props {
  onChange: (content: Forms.Content) => void;
  esDocsBase: string;
  defaultValue?: { [key: string]: any };
  indexMode?: IndexMode;
}

export const StepSettings: React.FunctionComponent<Props> = React.memo(
  ({ defaultValue = {}, onChange, esDocsBase, indexMode }) => {
    const { navigateToStep } = Forms.useFormWizardContext();
    const { jsonContent, setJsonContent, error } = useJsonStep({
      defaultValue,
      onChange,
    });

    return (
      <div data-test-subj="stepSettings">
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiTitle>
              <h2 data-test-subj="stepTitle">
                <FormattedMessage
                  id="xpack.idxMgmt.formWizard.stepSettings.stepTitle"
                  defaultMessage="Index settings (optional)"
                />
              </h2>
            </EuiTitle>

            <EuiSpacer size="s" />

            <EuiText>
              <p>
                <FormattedMessage
                  id="xpack.idxMgmt.formWizard.stepSettings.settingsDescription"
                  defaultMessage="Define the behavior of your indices."
                />
              </p>
            </EuiText>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              flush="right"
              href={documentationService.getSettingsDocumentationLink()}
              target="_blank"
              iconType="help"
            >
              <FormattedMessage
                id="xpack.idxMgmt.formWizard.stepSettings.docsButtonLabel"
                defaultMessage="Index settings docs"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="l" />

        {indexMode && (
          <>
            <EuiCallOut
              title={
                <FormattedMessage
                  id="xpack.idxMgmt.formWizard.stepSettings.indexModeCallout.title"
                  defaultMessage="The {settingName} setting has been set to {indexMode} within the {logisticsLink}. Any changes to {settingName} set on this page will be overwritten by the Logistics selection."
                  values={{
                    settingName: (
                      <EuiCode>
                        {i18n.translate(
                          'xpack.idxMgmt.formWizard.stepSettings.indexModeCallout.indexModeSettingLabel',
                          {
                            defaultMessage: 'index.mode',
                          }
                        )}
                      </EuiCode>
                    ),
                    indexMode: indexModeLabels[indexMode],
                    logisticsLink: (
                      <EuiLink onClick={() => navigateToStep(0)}>
                        {i18n.translate(
                          'xpack.idxMgmt.formWizard.stepSettings.indexModeCallout.logisticsLinkLabel',
                          {
                            defaultMessage: 'Logistics step',
                          }
                        )}
                      </EuiLink>
                    ),
                  }}
                />
              }
              color="warning"
              iconType="warning"
              data-test-subj="indexModeCallout"
            />

            <EuiSpacer size="l" />
          </>
        )}

        {/* Settings code editor */}
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.idxMgmt.formWizard.stepSettings.fieldIndexSettingsLabel"
              defaultMessage="Index settings"
            />
          }
          helpText={
            <FormattedMessage
              id="xpack.idxMgmt.formWizard.stepSettings.settingsEditorHelpText"
              defaultMessage="Use JSON format: {code}"
              values={{
                code: <EuiCode>{JSON.stringify({ number_of_replicas: 1 })}</EuiCode>,
              }}
            />
          }
          isInvalid={Boolean(error)}
          error={error}
          fullWidth
        >
          <CodeEditor
            languageId="json"
            value={jsonContent}
            data-test-subj="settingsEditor"
            height={500}
            options={{
              lineNumbers: 'off',
              tabSize: 2,
              automaticLayout: true,
            }}
            aria-label={i18n.translate(
              'xpack.idxMgmt.formWizard.stepSettings.fieldIndexSettingsAriaLabel',
              {
                defaultMessage: 'Index settings editor',
              }
            )}
            onChange={setJsonContent}
          />
        </EuiFormRow>
      </div>
    );
  }
);
