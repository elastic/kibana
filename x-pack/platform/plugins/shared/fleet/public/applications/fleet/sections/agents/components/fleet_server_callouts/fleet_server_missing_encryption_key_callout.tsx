/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty, EuiCallOut, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { useStartServices } from '../../../../hooks';

export interface FleetServerMissingEncryptionKeyCalloutProps {
  onClickHandler: () => void;
}

export const FleetServerMissingEncryptionKeyCallout: React.FunctionComponent<
  FleetServerMissingEncryptionKeyCalloutProps
> = ({ onClickHandler }) => {
  const { docLinks } = useStartServices();
  return (
    <EuiCallOut
      data-test-subj="missingEncryptionKeyCallout"
      iconType="iInCircle"
      color="warning"
      title={
        <FormattedMessage
          id="xpack.fleet.missingEncryptionKeyCallout.title"
          defaultMessage="Set up encryption key"
        />
      }
    >
      <p data-test-subj="missingEncryptionKeyBody">
        <FormattedMessage
          id="xpack.fleet.missingEncryptionKeyCallout.message"
          defaultMessage="An encryption key will make your environment more secure. Click {link} to learn how to set up an encryption key."
          values={{
            link: (
              <EuiLink href={docLinks.links.kibana.secureSavedObject} target="_blank">
                <FormattedMessage
                  id="xpack.fleet.missingEncryptionKeyCallout.helpLink"
                  defaultMessage="here"
                />
              </EuiLink>
            ),
          }}
        />
      </p>
      <EuiButtonEmpty flush="left" size="s" color="warning" onClick={onClickHandler}>
        <FormattedMessage
          id="xpack.fleet.missingEncryptionKeyCallout.dismiss"
          defaultMessage="Dismiss"
        />
      </EuiButtonEmpty>
    </EuiCallOut>
  );
};
