import React from 'react';

import {
  KuiPage,
  KuiPageBody,
  KuiPageContent,
  KuiPageContentBody,
  KuiPageContentHeader,
  KuiPageContentHeaderSection,
  KuiPageHeader,
  KuiPageHeaderSection,
  KuiTitle,
} from '../../../../components';

export default () => (
  <KuiPage>
    <KuiPageHeader>
      <KuiPageHeaderSection>
        <KuiTitle size="large">
          <h1>Page title</h1>
        </KuiTitle>
      </KuiPageHeaderSection>
    </KuiPageHeader>
    <KuiPageBody>
      <KuiPageContent>
        <KuiPageContentHeader>
          <KuiPageContentHeaderSection>
            <KuiTitle>
              <h2>Content title</h2>
            </KuiTitle>
          </KuiPageContentHeaderSection>
        </KuiPageContentHeader>
        <KuiPageContentBody>
          Content body
        </KuiPageContentBody>
      </KuiPageContent>
    </KuiPageBody>
  </KuiPage>
);

