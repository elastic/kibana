/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback } from 'react';
import {
  EuiText,
  EuiHorizontalRule,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
} from '@elastic/eui';
import styled, { css } from 'styled-components';
import * as i18n from '../../translations';
import { Form, useForm } from '../../../shared_imports';
import { schema } from './schema';
import { CommonUseField } from '../create';

interface IconAction {
  'aria-label': string;
  iconType: string;
  onClick: (b: boolean) => void;
  onSubmit: (a: string[]) => void;
}

interface TagListProps {
  tags: string[];
  iconAction?: IconAction;
  isEditTags?: boolean;
}

const MyFlexGroup = styled(EuiFlexGroup)`
  ${({ theme }) => css`
    margin-top: ${theme.eui.euiSizeM};
    p {
      font-size: ${theme.eui.euiSizeM};
    }
  `}
`;

export const TagList = React.memo(({ tags, isEditTags, iconAction }: TagListProps) => {
  const { form } = useForm({
    defaultValue: { tags },
    options: { stripEmptyFields: false },
    schema,
  });

  const onSubmit = useCallback(async () => {
    const { isValid, data: newData } = await form.submit();
    if (isValid && iconAction) {
      iconAction.onSubmit(newData.tags);
      iconAction.onClick(false);
    }
  }, [form]);

  const onActionClick = useCallback(
    (cb: (b: boolean) => void, onClickBool: boolean) => cb(onClickBool),
    [iconAction]
  );
  return (
    <EuiText>
      <EuiFlexGroup alignItems="center" gutterSize="xs" justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <h4>{i18n.TAGS}</h4>
        </EuiFlexItem>
        {iconAction && (
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              aria-label={iconAction['aria-label']}
              iconType={iconAction.iconType}
              onClick={() => onActionClick(iconAction.onClick, true)}
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
        {isEditTags && iconAction && (
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
              <EuiButton fill onClick={onSubmit}>
                {i18n.SUBMIT}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty onClick={() => onActionClick(iconAction.onClick, false)}>
                {i18n.CANCEL}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </MyFlexGroup>
    </EuiText>
  );
});

TagList.displayName = 'TagList';
