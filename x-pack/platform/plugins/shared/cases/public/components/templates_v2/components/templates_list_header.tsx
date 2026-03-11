/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { HeaderPage } from '../../header_page';
import * as i18n from '../../templates/translations';
import { LinkButton } from '../../links';
import { useCasesCreateTemplateNavigation } from '../../../common/navigation';
import { TemplateFlyout } from './template_flyout';

export const TemplatesListHeader: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const { getCasesCreateTemplateUrl, navigateToCasesCreateTemplate } =
    useCasesCreateTemplateNavigation();
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);

  const openFlyout = useCallback(() => {
    setIsFlyoutOpen(true);
  }, []);

  const closeFlyout = useCallback(() => {
    setIsFlyoutOpen(false);
  }, []);

  return (
    <>
      <HeaderPage title={i18n.TEMPLATE_TITLE} border data-test-subj="cases-all-title">
        <EuiFlexGroup
          alignItems="center"
          gutterSize="m"
          wrap={true}
          data-test-subj="all-templates-header"
        >
          <EuiFlexItem>
            <EuiFlexGroup
              responsive={false}
              css={css`
                & {
                  @media only screen and (max-width: ${euiTheme.breakpoint.s}) {
                    flex-direction: column;
                  }
                }
              `}
            >
              <EuiFlexItem grow={false}>
                <LinkButton
                  onClick={openFlyout}
                  href={'#'}
                  iconType="importAction"
                  isDisabled={false}
                  aria-label={i18n.IMPORT_TEMPLATE}
                  isEmpty={true}
                  data-test-subj="import-template-button"
                >
                  {i18n.IMPORT_TEMPLATE}
                </LinkButton>
              </EuiFlexItem>
              <EuiFlexItem>
                <LinkButton
                  fill
                  onClick={navigateToCasesCreateTemplate}
                  href={getCasesCreateTemplateUrl()}
                  iconType="plusInCircle"
                  data-test-subj="create-template-button"
                >
                  {i18n.CREATE_TEMPLATE}
                </LinkButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </HeaderPage>
      {isFlyoutOpen && <TemplateFlyout onClose={closeFlyout} onImport={closeFlyout} />}
    </>
  );
};

TemplatesListHeader.displayName = 'TemplatesListHeader';
