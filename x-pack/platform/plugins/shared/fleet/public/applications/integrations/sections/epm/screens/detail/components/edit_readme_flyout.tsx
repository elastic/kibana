/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';

import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
  EuiIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiMarkdownEditor,
  EuiButton,
  EuiButtonEmpty,
} from '@elastic/eui';
// import { FormattedMessage } from '@kbn/i18n-react';

export const EditReadmeFlyout: React.FunctionComponent<{
  readMeContent: string | undefined;
  onClose: () => void;
  integrationName: string;
  onSave: (updatedReadMe: string | undefined) => void;
}> = ({ onClose, integrationName, readMeContent, onSave }) => {
  const [editedContent, setEditedContent] = React.useState(readMeContent);
  const onParse = useCallback((err: any, {}) => {
    if (err) {
      // handle error
      return;
    }
    // do something with messages and ast
  }, []);
  return (
    <EuiFlyout ownFocus onClose={onClose} aria-labelledby="editReadmeFlyoutTitle">
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            {/* TODO: need to get the icon from the integration and use it here */}
            <EuiIcon type="pencil" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle>
              <h2 id="editReadmeFlyoutTitle">Editing {integrationName} overview</h2>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiMarkdownEditor
          aria-label="Edit"
          placeholder="Edit the readme content here..."
          value={editedContent!}
          onChange={(e) => setEditedContent}
          onParse={onParse}
          readOnly={false}
          height={600}
        />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose}>Cancel</EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton fill color="primary" onClick={() => onSave(readMeContent)}>
              Save Changes
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
