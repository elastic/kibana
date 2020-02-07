/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiFormRow, EuiFlexGroup, EuiFlexItem, EuiFieldText, EuiButton } from '@elastic/eui';
import { ArgumentStrings } from '../../../../../i18n';

const { ImageUpload: strings } = ArgumentStrings;

export const LinkForm = ({ url, inputRef, onSubmit }) => (
  <EuiFormRow display="rowCompressed" onSubmit={onSubmit} className="eui-textRight">
    <EuiFlexGroup gutterSize="xs">
      <EuiFlexItem>
        <EuiFieldText
          compressed
          defaultValue={url}
          inputRef={inputRef}
          placeholder={strings.getUrlFieldPlaceholder()}
          aria-label={strings.getUrlFieldPlaceholder()}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton type="submit" size="s" onClick={onSubmit}>
          Set
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiFormRow>
);

LinkForm.propTypes = {
  url: PropTypes.string,
  inputRef: PropTypes.func,
  onSubmit: PropTypes.func,
};
