/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiComboBox, EuiLink } from '@elastic/eui';
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

  return (
    <EuiFormRow
      fullWidth={fullWidth}
      isInvalid={!!validationError}
      error={validationError}
      label={
        <FormattedMessage
          id={'xpack.fleet.createPackagePolicy.stepConfigure.packagePolicyNamespaceInputLabel'}
          defaultMessage="Namespace"
        />
      }
      helpText={getHelpText()}
    >
      <EuiComboBox
        fullWidth={fullWidth}
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
