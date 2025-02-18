/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiBadge,
  useEuiTheme,
  EuiButtonIcon,
  EuiBadgeGroup,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { TruncatedText } from '../truncated_text';
import type { TemplateConfiguration, TemplatesConfiguration } from '../../../common/types/domain';
import { DeleteConfirmationModal } from '../configure_cases/delete_confirmation_modal';
import * as i18n from './translations';
export interface Props {
  templates: TemplatesConfiguration;
  onDeleteTemplate: (key: string) => void;
  onEditTemplate: (key: string) => void;
}

const TemplatesListComponent: React.FC<Props> = (props) => {
  const { templates, onEditTemplate, onDeleteTemplate } = props;
  const { euiTheme } = useEuiTheme();
  const [itemToBeDeleted, setItemToBeDeleted] = useState<TemplateConfiguration | null>(null);

  const onConfirm = useCallback(() => {
    if (itemToBeDeleted) {
      onDeleteTemplate(itemToBeDeleted.key);
    }

    setItemToBeDeleted(null);
  }, [onDeleteTemplate, setItemToBeDeleted, itemToBeDeleted]);

  const onCancel = useCallback(() => {
    setItemToBeDeleted(null);
  }, []);

  const showModal = Boolean(itemToBeDeleted);

  return templates.length ? (
    <>
      <EuiSpacer size="s" />
      <EuiFlexGroup justifyContent="flexStart" data-test-subj="templates-list">
        <EuiFlexItem>
          {templates.map((template) => (
            <React.Fragment key={template.key}>
              <EuiPanel
                paddingSize="s"
                data-test-subj={`template-${template.key}`}
                hasShadow={false}
              >
                <EuiFlexGroup alignItems="center" gutterSize="s">
                  <EuiFlexItem grow={true}>
                    <EuiFlexGroup alignItems="center" gutterSize="s">
                      <EuiFlexItem grow={false}>
                        <EuiText size="s">
                          <h4>
                            <TruncatedText text={template.name} />
                          </h4>
                        </EuiText>
                      </EuiFlexItem>
                      <EuiBadgeGroup gutterSize="s">
                        {template.tags?.length
                          ? template.tags.map((tag, index) => (
                              <EuiBadge
                                css={css`
                                  max-width: 100px;
                                `}
                                key={`${template.key}-tag-${index}`}
                                data-test-subj={`${template.key}-tag-${index}`}
                                color={euiTheme.colors.body}
                              >
                                {tag}
                              </EuiBadge>
                            ))
                          : null}
                      </EuiBadgeGroup>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiFlexGroup alignItems="flexEnd" gutterSize="s">
                      <EuiFlexItem grow={false}>
                        <EuiButtonIcon
                          data-test-subj={`${template.key}-template-edit`}
                          aria-label={`${template.key}-template-edit`}
                          iconType="pencil"
                          color="primary"
                          onClick={() => onEditTemplate(template.key)}
                        />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiButtonIcon
                          data-test-subj={`${template.key}-template-delete`}
                          aria-label={`${template.key}-template-delete`}
                          iconType="minusInCircle"
                          color="danger"
                          onClick={() => setItemToBeDeleted(template)}
                        />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
              <EuiSpacer size="s" />
            </React.Fragment>
          ))}
        </EuiFlexItem>
        {showModal && itemToBeDeleted ? (
          <DeleteConfirmationModal
            title={i18n.DELETE_TITLE(itemToBeDeleted.name)}
            message={i18n.DELETE_MESSAGE(itemToBeDeleted.name)}
            onCancel={onCancel}
            onConfirm={onConfirm}
          />
        ) : null}
      </EuiFlexGroup>
    </>
  ) : null;
};

TemplatesListComponent.displayName = 'TemplatesList';

export const TemplatesList = React.memo(TemplatesListComponent);
