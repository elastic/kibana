/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import {
  EuiButton,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import type { PackageInfo } from '../../../../../types';
import { PackageIcon } from '../../../../../components';
import { sendGetFileByPath, useStartServices } from '../../../../../hooks';
import { epmRouteService } from '../../../../../services';
import { Readme } from '../../../../../../integrations/sections/epm/screens/detail/overview/readme';
import { INTEGRATIONS_PLUGIN_ID } from '../../../../../../integrations/constants';

interface Props {
  packageInfo: PackageInfo;
  onClose: () => void;
}

export const PackageDocumentationModal: React.FC<Props> = ({ packageInfo, onClose }) => {
  const { http, application } = useStartServices();
  const [markdown, setMarkdown] = useState<string | undefined>(undefined);
  const refs = useRef(new Map<string, HTMLDivElement | null>());

  useEffect(() => {
    if (packageInfo.readme) {
      sendGetFileByPath(packageInfo.readme)
        .then((res) => {
          setMarkdown(res.data ?? '');
        })
        .catch(() => {
          setMarkdown('');
        });
    }
  }, [packageInfo.readme]);

  const screenshot = packageInfo.screenshots?.[0];
  const screenshotUrl = screenshot?.src
    ? http.basePath.prepend(
        epmRouteService.getFilePath(
          `/package/${packageInfo.name}/${packageInfo.version}${screenshot.src}`
        )
      )
    : undefined;

  const detailItems = [
    {
      title: (
        <FormattedMessage
          id="xpack.fleet.packageDocumentationModal.versionLabel"
          defaultMessage="Version"
        />
      ),
      description: packageInfo.version,
    },
    ...(packageInfo.categories?.length
      ? [
          {
            title: (
              <FormattedMessage
                id="xpack.fleet.packageDocumentationModal.categoryLabel"
                defaultMessage="Category"
              />
            ),
            description: packageInfo.categories.join(', '),
          },
        ]
      : []),
  ];

  const modalCss = css`
    max-width: 860px;
    width: 100%;
  `;
  const readmePaneCss = css`
    min-width: 0;
  `;
  const sidebarCss = css`
    min-width: 200px;
    max-width: 220px;
  `;

  return (
    <EuiModal
      onClose={onClose}
      css={modalCss}
      aria-label={i18n.translate('xpack.fleet.packageDocumentationModal.ariaLabel', {
        defaultMessage: '{packageTitle} integration documentation',
        values: { packageTitle: packageInfo.title },
      })}
    >
      <EuiModalHeader>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <PackageIcon
              packageName={packageInfo.name}
              version={packageInfo.version}
              icons={packageInfo.icons}
              size="m"
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiModalHeaderTitle>
              <FormattedMessage
                id="xpack.fleet.packageDocumentationModal.title"
                defaultMessage="{packageTitle} integration documentation"
                values={{ packageTitle: packageInfo.title }}
              />
            </EuiModalHeaderTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiFlexGroup alignItems="flexStart" gutterSize="l">
          <EuiFlexItem css={readmePaneCss}>
            <Readme
              packageName={packageInfo.name}
              version={packageInfo.version}
              markdown={markdown}
              refs={refs}
            />
          </EuiFlexItem>

          <EuiFlexItem grow={false} css={sidebarCss}>
            {screenshotUrl && (
              <>
                <EuiTitle size="xxs">
                  <h3>
                    <FormattedMessage
                      id="xpack.fleet.packageDocumentationModal.screenshotTitle"
                      defaultMessage="Screenshot"
                    />
                  </h3>
                </EuiTitle>
                <EuiSpacer size="s" />
                <EuiImage
                  src={screenshotUrl}
                  alt={
                    screenshot?.title ||
                    i18n.translate('xpack.fleet.packageDocumentationModal.screenshotAlt', {
                      defaultMessage: '{packageTitle} screenshot',
                      values: { packageTitle: packageInfo.title },
                    })
                  }
                  size="fullWidth"
                />
                <EuiSpacer size="l" />
              </>
            )}

            <EuiTitle size="xxs">
              <h3>
                <FormattedMessage
                  id="xpack.fleet.packageDocumentationModal.detailsTitle"
                  defaultMessage="Details"
                />
              </h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiText size="s">
              <EuiDescriptionList
                type="column"
                columnWidths={[1, 1]}
                listItems={detailItems}
                compressed
              />
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButton
              onClick={() =>
                application.navigateToApp(INTEGRATIONS_PLUGIN_ID, {
                  path: `/detail/${packageInfo.name}-${packageInfo.version}/overview`,
                })
              }
              fill={false}
              data-test-subj="packageDocumentationModalViewDetails"
            >
              <FormattedMessage
                id="xpack.fleet.packageDocumentationModal.viewDetailsButton"
                defaultMessage="Integration details"
              />
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              onClick={onClose}
              fill={false}
              data-test-subj="packageDocumentationModalClose"
            >
              <FormattedMessage
                id="xpack.fleet.packageDocumentationModal.closeButton"
                defaultMessage="Close"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  );
};
