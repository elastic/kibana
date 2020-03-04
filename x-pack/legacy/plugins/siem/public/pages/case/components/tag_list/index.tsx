/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiText,
  EuiHorizontalRule,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiLoadingSpinner,
} from '@elastic/eui';
import styled, { css } from 'styled-components';
import * as i18n from '../../translations';
import { Form, useForm } from '../../../../shared_imports';
import { schema } from './schema';
import { CommonUseField } from '../create';

interface TagListProps {
  isLoading: boolean;
  onSubmit: (a: string[]) => void;
  tags: string[];
}

const MyFlexGroup = styled(EuiFlexGroup)`
  ${({ theme }) => css`
    margin-top: ${theme.eui.euiSizeM};
    p {
      font-size: ${theme.eui.euiSizeM};
    }
  `}
`;

export const TagList = React.memo(({ isLoading, onSubmit, tags }: TagListProps) => {
  const { form } = useForm({
    defaultValue: { tags },
    options: { stripEmptyFields: false },
    schema,
  });
  const [isEditTags, setIsEditTags] = useState(false);

  const onSubmitTags = useCallback(async () => {
    const { isValid, data: newData } = await form.submit();
    if (isValid && newData.tags) {
      onSubmit(newData.tags);
      setIsEditTags(false);
    }
  }, [form, onSubmit]);

  return (
    <EuiText>
      <EuiFlexGroup alignItems="center" gutterSize="xs" justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <h4>{i18n.TAGS}</h4>
        </EuiFlexItem>
        {isLoading && <EuiLoadingSpinner />}
        {!isLoading && (
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              aria-label={'tags'}
              iconType={'pencil'}
              onClick={setIsEditTags.bind(null, true)}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiHorizontalRule margin="xs" />
      <MyFlexGroup gutterSize="xs">
        {tags.length === 0 && !isEditTags && <p>{i18n.NO_TAGS}</p>}
        {tags.length > 0 &&
          !isEditTags &&
          tags.map((tag, key) => (
            <EuiFlexItem grow={false} key={`${tag}${key}`}>
              <EuiBadge color="hollow">{tag}</EuiBadge>
            </EuiFlexItem>
          ))}
        {isEditTags && (
          <EuiFlexGroup direction="column">
            <EuiFlexItem>
              <Form form={form}>
                <CommonUseField
                  path="tags"
                  componentProps={{
                    idAria: 'caseTags',
                    'data-test-subj': 'caseTags',
                    euiFieldProps: {
                      fullWidth: true,
                      placeholder: '',
                    },
                  }}
                />
              </Form>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFlexGroup gutterSize="s" alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiButton color="secondary" fill iconType="save" onClick={onSubmitTags} size="s">
                    {i18n.SAVE}
                  </EuiButton>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    iconType="cross"
                    onClick={setIsEditTags.bind(null, false)}
                    size="s"
                  >
                    {i18n.CANCEL}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </MyFlexGroup>
    </EuiText>
  );
});

TagList.displayName = 'TagList';
