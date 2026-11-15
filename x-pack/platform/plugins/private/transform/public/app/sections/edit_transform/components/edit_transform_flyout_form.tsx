/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, type PropsWithChildren, useState } from 'react';

import { css } from '@emotion/react';
import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiIcon,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { EditTransformDurationInput } from './edit_transform_duration_input';
import { EditTransformFlyoutFormTextArea } from './edit_transform_flyout_form_text_area';
import { EditTransformFlyoutFormTextInput } from './edit_transform_flyout_form_text_input';
import { EditTransformRetentionPolicy } from './edit_transform_retention_policy';
import { EditTransformIngestPipeline } from './edit_transform_ingest_pipeline';
import {
  EditTransformProjectScope,
  type LoadedTransformProjectScopeProjects,
} from './edit_transform_project_scope';

interface EditTransformFlyoutFormProps {
  onOpenProjectScope: (projects: LoadedTransformProjectScopeProjects) => void;
}

interface EditTransformAccordionProps {
  'data-test-subj': string;
  id: string;
  title: string;
}

const EditTransformAccordion: FC<PropsWithChildren<EditTransformAccordionProps>> = ({
  children,
  'data-test-subj': dataTestSubj,
  id,
  title,
}) => {
  const { euiTheme } = useEuiTheme();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <EuiAccordion
      css={css`
        margin-inline: -${euiTheme.size.l};
      `}
      data-test-subj={dataTestSubj}
      id={id}
      buttonContent={
        <EuiFlexGroup
          alignItems="center"
          css={css`
            width: 100%;
          `}
          gutterSize="s"
          justifyContent="spaceBetween"
          responsive={false}
        >
          <EuiFlexItem>
            <EuiText
              css={css`
                font-weight: ${euiTheme.font.weight.semiBold};
              `}
              size="s"
            >
              {title}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiIcon type={isOpen ? 'chevronSingleUp' : 'chevronSingleDown'} aria-hidden={true} />
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      arrowDisplay="none"
      borders="horizontal"
      buttonContentClassName="eui-fullWidth"
      buttonProps={{ paddingSize: 'l' }}
      forceState={isOpen ? 'open' : 'closed'}
      onToggle={setIsOpen}
      paddingSize="l"
    >
      {children}
    </EuiAccordion>
  );
};

export const EditTransformFlyoutForm: FC<EditTransformFlyoutFormProps> = ({
  onOpenProjectScope,
}) => (
  <EuiForm fullWidth>
    <EditTransformProjectScope onOpenProjectScope={onOpenProjectScope} />

    <EditTransformFlyoutFormTextArea
      field="description"
      label={i18n.translate('xpack.transform.transformList.editFlyoutFormDescriptionLabel', {
        defaultMessage: 'Description',
      })}
    />
    <EditTransformDurationInput
      defaultUnit="m"
      field="frequency"
      label={i18n.translate('xpack.transform.transformList.editFlyoutFormFrequencyLabel', {
        defaultMessage: 'Frequency',
      })}
      helpText={i18n.translate('xpack.transform.transformList.editFlyoutFormFrequencyHelpText', {
        defaultMessage:
          'The interval to check for changes in source indices when the transform runs continuously.',
      })}
      units={['s', 'm', 'h']}
    />

    <EuiSpacer size="l" />

    <EditTransformRetentionPolicy />

    <EuiSpacer size="l" />

    <EditTransformAccordion
      data-test-subj="transformEditAccordionDestination"
      id="transformEditAccordionDestination"
      title={i18n.translate(
        'xpack.transform.transformList.editFlyoutFormDestinationButtonContent',
        {
          defaultMessage: 'Destination configuration',
        }
      )}
    >
      <div data-test-subj="transformEditAccordionDestinationContent">
        <EditTransformFlyoutFormTextInput
          field="destinationIndex"
          label={i18n.translate(
            'xpack.transform.transformList.editFlyoutFormDestinationIndexLabel',
            {
              defaultMessage: 'Destination index',
            }
          )}
        />

        <EuiSpacer size="m" />

        <div data-test-subj="transformEditAccordionIngestPipelineContent">
          <EditTransformIngestPipeline />
        </div>
      </div>
    </EditTransformAccordion>

    <EditTransformAccordion
      data-test-subj="transformEditAccordionAdvancedSettings"
      id="transformEditAccordionAdvancedSettings"
      title={i18n.translate(
        'xpack.transform.transformList.editFlyoutFormAdvancedSettingsButtonContent',
        {
          defaultMessage: 'Advanced settings',
        }
      )}
    >
      <div data-test-subj="transformEditAccordionAdvancedSettingsContent">
        <EditTransformFlyoutFormTextInput
          field="docsPerSecond"
          helpText={i18n.translate(
            'xpack.transform.transformList.editFlyoutFormDocsPerSecondHelpText',
            {
              defaultMessage: 'To enable throttling, set a limit of documents to input per second.',
            }
          )}
          label={i18n.translate('xpack.transform.transformList.editFlyoutFormDocsPerSecondLabel', {
            defaultMessage: 'Documents per second',
          })}
        />
        <EditTransformFlyoutFormTextInput
          field="maxPageSearchSize"
          helpText={i18n.translate(
            'xpack.transform.transformList.editFlyoutFormMaxPageSearchSizeHelpText',
            {
              defaultMessage:
                'The initial page size to use for the composite aggregation for each checkpoint.',
            }
          )}
          label={i18n.translate(
            'xpack.transform.transformList.editFlyoutFormMaxPageSearchSizeLabel',
            {
              defaultMessage: 'Maximum page search size',
            }
          )}
          placeHolder={true}
        />
        <EditTransformFlyoutFormTextInput
          field="numFailureRetries"
          helpText={i18n.translate(
            'xpack.transform.transformList.editFlyoutFormNumFailureRetriesHelpText',
            {
              defaultMessage:
                'The number of retries on a recoverable failure before the transform task is marked as failed. Set it to -1 for infinite retries.',
            }
          )}
          label={i18n.translate('xpack.transform.transformList.numFailureRetriesLabel', {
            defaultMessage: 'Number of failure retries',
          })}
        />
      </div>
    </EditTransformAccordion>
  </EuiForm>
);
