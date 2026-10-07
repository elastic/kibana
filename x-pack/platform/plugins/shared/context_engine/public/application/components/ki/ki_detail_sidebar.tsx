/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiDescriptionListProps } from '@elastic/eui';
import { css } from '@emotion/react';
import { EuiCode, EuiDescriptionList, EuiLink, EuiTextBlockTruncate, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { useKibana } from '../../hooks/use_kibana';
import type { KiGovernanceWriter } from './ki_detail_helpers';
import {
  getKiWriterAgentManageHref,
  getKiWriterUriHref,
  getWriterAgentId,
  isHttpUri,
  parseWriterUri,
} from './ki_detail_helpers';

export const KI_DETAIL_SIDEBAR_VALUE_MAX_LINES = 3;

export const KiDetailSidebarSectionTitle = ({ children }: { children: React.ReactNode }) => (
  <EuiTitle size="xs">
    <h3>{children}</h3>
  </EuiTitle>
);

interface KiDetailSidebarDescriptionListProps {
  listItems: EuiDescriptionListProps['listItems'];
  'data-test-subj'?: string;
}

export const KiDetailSidebarDescriptionList = ({
  listItems,
  'data-test-subj': dataTestSubj,
}: KiDetailSidebarDescriptionListProps) => (
  <EuiDescriptionList
    type="row"
    textStyle="normal"
    compressed
    rowGutterSize="m"
    listItems={listItems}
    data-test-subj={dataTestSubj}
  />
);

interface KiDetailSidebarBreakableTextProps {
  children: React.ReactNode;
  title?: string;
}

export const KiDetailSidebarBreakableText = ({
  children,
  title,
}: KiDetailSidebarBreakableTextProps) => {
  const tooltipTitle = title ?? (typeof children === 'string' ? children : undefined);

  return (
    <EuiTextBlockTruncate
      lines={KI_DETAIL_SIDEBAR_VALUE_MAX_LINES}
      className="eui-textBreakWord"
      title={tooltipTitle}
    >
      {children}
    </EuiTextBlockTruncate>
  );
};

const kiDetailSidebarWriterValueCodeCss = css`
  padding: 0;
`;

interface KiDetailSidebarWriterValueProps {
  value: string;
  href?: string;
}

const KiDetailSidebarWriterValue = ({ value, href }: KiDetailSidebarWriterValueProps) => {
  if (href) {
    return (
      <EuiLink
        href={href}
        className="eui-textBreakWord"
        {...(isHttpUri(href) ? { external: true } : {})}
      >
        {value}
      </EuiLink>
    );
  }

  return (
    <EuiCode transparentBackground css={kiDetailSidebarWriterValueCodeCss}>
      {value}
    </EuiCode>
  );
};

interface KiDetailSidebarWriterProvenanceProps {
  writer: KiGovernanceWriter;
}

export const KiDetailSidebarWriterProvenance = ({
  writer,
}: KiDetailSidebarWriterProvenanceProps) => {
  const {
    services: { application },
  } = useKibana();
  const getUrlForApp = application.getUrlForApp;

  const parsed = parseWriterUri(writer.uri);
  const agentId = getWriterAgentId(writer.metadata);
  const agentHref = useMemo(
    () => (agentId ? getKiWriterAgentManageHref(getUrlForApp, agentId) : undefined),
    [agentId, getUrlForApp]
  );
  const writerUriHref = useMemo(
    () => getKiWriterUriHref(getUrlForApp, writer.uri),
    [getUrlForApp, writer.uri]
  );

  const agentRoleLabel = i18n.translate('xpack.contextEngine.kiDetail.writerUri.role.agent', {
    defaultMessage: 'agent',
  });
  const withConnectorLabel = i18n.translate(
    'xpack.contextEngine.kiDetail.writerUri.withConnector',
    {
      defaultMessage: 'with',
    }
  );

  if (!parsed) {
    return (
      <span title={writer.uri}>
        {agentId ? (
          <>
            {agentRoleLabel} <KiDetailSidebarWriterValue value={agentId} href={agentHref} />{' '}
            {writer.uri.length > 0 ? <>{withConnectorLabel} </> : null}
          </>
        ) : null}
        {writer.uri.length > 0 ? (
          <KiDetailSidebarWriterValue value={writer.uri} href={writerUriHref} />
        ) : null}
      </span>
    );
  }

  const schemeRoleLabel = parsed.scheme.toLowerCase();
  const tooltipParts = [
    agentId ? `${agentRoleLabel} ${agentId}` : undefined,
    `${schemeRoleLabel} ${parsed.identifier}`,
  ].filter((part): part is string => part !== undefined);

  return (
    <span title={tooltipParts.join(' · ')}>
      {agentId ? (
        <>
          {agentRoleLabel} <KiDetailSidebarWriterValue value={agentId} href={agentHref} />{' '}
          {withConnectorLabel}{' '}
        </>
      ) : null}
      {schemeRoleLabel}{' '}
      <KiDetailSidebarWriterValue value={parsed.identifier} href={writerUriHref} />
    </span>
  );
};
