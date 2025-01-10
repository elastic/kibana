/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { EuiButton, EuiPageHeader } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

interface HeaderProps {
  canCreate: boolean;
  onCreate: () => void;
}

export const Header: FC<HeaderProps> = ({ canCreate, onCreate }) => {
  return (
    <EuiPageHeader
      pageTitle={
        <FormattedMessage
          id="xpack.savedObjectsTagging.management.headerTitle"
          defaultMessage="Tags"
        />
      }
      bottomBorder
      description={
        <FormattedMessage
          id="xpack.savedObjectsTagging.management.headerDescription"
          defaultMessage="Use tags to categorize and easily find your objects."
        />
      }
      rightSideItems={[
        canCreate && (
          <EuiButton
            key="createTag"
            iconType="tag"
            color="primary"
            fill
            data-test-subj="createTagButton"
            onClick={onCreate}
            isDisabled={false}
          >
            <FormattedMessage
              id="xpack.savedObjectsTagging.management.actions.createTagButton"
              defaultMessage="Create tag"
            />
          </EuiButton>
        ),
      ]}
    />
  );
};
