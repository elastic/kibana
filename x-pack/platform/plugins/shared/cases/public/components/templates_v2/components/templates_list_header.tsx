/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import * as i18n from '../translations';
import * as fieldLibraryI18n from '../../field_library/translations';
import { LinkButton } from '../../links';
import {
  useCasesCreateTemplateNavigation,
  useCasesFieldLibraryNavigation,
} from '../../../common/navigation';
import { TemplateFlyout } from './template_flyout';

export const TemplatesListHeader: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const { getCasesCreateTemplateUrl, navigateToCasesCreateTemplate } =
    useCasesCreateTemplateNavigation();
  const { getCasesFieldLibraryUrl, navigateToCasesFieldLibrary } = useCasesFieldLibraryNavigation();
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);

  const openFlyout = useCallback(() => {
    setIsFlyoutOpen(true);
  }, []);

  const closeFlyout = useCallback(() => {
    setIsFlyoutOpen(false);
  }, []);

  return (
    <>
      <EuiFlexGroup
        alignItems="center"
        gutterSize="m"
        wrap={true}
        justifyContent="flexEnd"
        data-test-subj="all-templates-header"
        css={css`
          padding-bottom: ${euiTheme.size.l};
        `}
      >
        <EuiFlexItem grow={false}>
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
                onClick={navigateToCasesFieldLibrary}
                href={getCasesFieldLibraryUrl()}
                iconType="database"
                isEmpty={true}
                data-test-subj="field-library-button"
              >
                {fieldLibraryI18n.FIELD_LIBRARY_TITLE}
              </LinkButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <LinkButton
                onClick={openFlyout}
                href={'#'}
                iconType="download"
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
                iconType="plusCircle"
                data-test-subj="create-template-button"
              >
                {i18n.CREATE_TEMPLATE}
              </LinkButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      {isFlyoutOpen && <TemplateFlyout onClose={closeFlyout} onImport={closeFlyout} />}
    </>
  );
};

TemplatesListHeader.displayName = 'TemplatesListHeader';
