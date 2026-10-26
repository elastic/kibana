/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiComboBox, EuiIconTip, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

interface NamespaceFormRowProps {
  namespace?: string;
  placeholder?: string;
  isEditPage: boolean;
  packageType?: string;
  validationError?: string[] | null;
  docLinks?: {
    links: {
      fleet: {
        datastreamsNamingScheme: string;
      };
    };
  };
  onNamespaceChange: (namespace: string) => void;
  'data-test-subj'?: string;
  fullWidth?: boolean;
  labelId?: string;
  helpTextId?: string;
  /** Shows the help text as a tooltip on an info icon next to the label, instead of under the field. */
  helpTextAsTooltip?: boolean;
  /** Renders the field in the compact size. */
  compressed?: boolean;
}

export const NamespaceComboBox: React.FC<NamespaceFormRowProps> = ({
  namespace,
  placeholder,
  isEditPage,
  packageType,
  validationError,
  docLinks,
  onNamespaceChange,
  'data-test-subj': dataTestSubj = 'packagePolicyNamespaceInput',
  fullWidth = false,
  helpTextAsTooltip = false,
  compressed = false,
}) => {
  const getHelpText = () => {
    if (isEditPage && packageType === 'input') {
      return (
        <FormattedMessage
          id="xpack.fleet.createPackagePolicy.stepConfigure.packagePolicyInputOnlyEditNamespaceHelpLabel"
          defaultMessage="The namespace cannot be changed for this integration. Create a new integration policy to use a different namespace."
        />
      );
    }

    const learnMoreLink = (
      <EuiLink
        href={
          docLinks?.links?.fleet?.datastreamsNamingScheme ||
          'https://www.elastic.co/docs/reference/fleet/data-streams#data-streams-naming-scheme'
        }
        target="_blank"
      >
        {i18n.translate(
          'xpack.fleet.createPackagePolicy.stepConfigure.packagePolicyNamespaceHelpLearnMoreLabel',
          { defaultMessage: 'Learn more' }
        )}
      </EuiLink>
    );

    return (
      <FormattedMessage
        id="xpack.fleet.createPackagePolicy.stepConfigure.packagePolicyNamespaceHelpLabel"
        defaultMessage="Change the default namespace inherited from the parent agent policy. This setting changes the name of the integration's data stream. {learnMore}."
        values={{
          learnMore: learnMoreLink,
        }}
      />
    );
  };

  const label = (
    <FormattedMessage
      id={'xpack.fleet.createPackagePolicy.stepConfigure.packagePolicyNamespaceInputLabel'}
      defaultMessage="Namespace"
    />
  );

  return (
    <EuiFormRow
      fullWidth={fullWidth}
      display={compressed ? 'rowCompressed' : 'row'}
      isInvalid={!!validationError}
      error={validationError}
      label={
        helpTextAsTooltip ? (
          <>
            {label}{' '}
            <EuiIconTip
              type="info"
              color="subdued"
              content={i18n.translate(
                'xpack.fleet.createPackagePolicy.stepConfigure.packagePolicyNamespaceTooltip',
                {
                  defaultMessage:
                    "This setting changes the name of the integration's data stream from default.",
                }
              )}
              anchorProps={{ 'data-test-subj': `${dataTestSubj}-helpTooltip` }}
            />
          </>
        ) : (
          label
        )
      }
      helpText={helpTextAsTooltip ? undefined : getHelpText()}
    >
      <EuiComboBox
        isInvalid={!!validationError}
        fullWidth={fullWidth}
        compressed={compressed}
        data-test-subj={dataTestSubj}
        noSuggestions
        placeholder={placeholder}
        isDisabled={isEditPage && packageType === 'input'}
        singleSelection={true}
        selectedOptions={namespace ? [{ label: namespace }] : []}
        onCreateOption={(newNamespace: string) => {
          onNamespaceChange(newNamespace);
        }}
        onChange={(newNamespaces: Array<{ label: string }>) => {
          onNamespaceChange(newNamespaces.length ? newNamespaces[0].label : '');
        }}
      />
    </EuiFormRow>
  );
};
