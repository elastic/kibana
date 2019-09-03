/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { Fragment } from 'react';
import { Space } from '../../../../../common/model/space';

interface Props {
  space: Space;
}

export const AdvancedSettingsSubtitle = (props: Props) => (
  <Fragment>
    <EuiSpacer size={'m'} />
    <EuiCallOut
      color="primary"
      iconType="spacesApp"
      title={
        <p>
          <FormattedMessage
            id="xpack.spaces.management.advancedSettingsSubtitle.applyingSettingsOnPageToSpaceDescription"
            defaultMessage="The settings on this page apply to the {spaceName} space, unless otherwise specified."
            values={{
              spaceName: <strong>{props.space.name}</strong>,
            }}
          />
        </p>
      }
    />
  </Fragment>
);
