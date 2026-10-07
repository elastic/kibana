/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiDescriptionListProps } from '@elastic/eui';
import { EuiCode, EuiDescriptionList, EuiLink, EuiTextBlockTruncate, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo } from 'react';
import { useKibana } from '../../hooks/use_kibana';
import type { KiGovernanceWriter } from './view_ki_helpers';
import {
  getKiWriterAgentManageHref,
  getKiWriterUriHref,
  getWriterAgentId,
  isHttpUri,
  parseWriterUri,
} from './view_ki_helpers';
import { kiLabelCapitalizeCss } from './ki_type_display';

export const VIEW_KI_SIDEBAR_VALUE_MAX_LINES = 3;

export const ViewKiSidebarSectionTitle = ({ children }: { children: React.ReactNode }) => (
  <EuiTitle size="xs">
    <h3>{children}</h3>
  </EuiTitle>
);

interface ViewKiSidebarDescriptionListProps {
  listItems: EuiDescriptionListProps['listItems'];
  'data-test-subj'?: string;
}

export const ViewKiSidebarDescriptionList = ({
  listItems,
  'data-test-subj': dataTestSubj,
}: ViewKiSidebarDescriptionListProps) => (
  <EuiDescriptionList
    type="row"
    textStyle="normal"
    compressed
    rowGutterSize="m"
    listItems={listItems}
    data-test-subj={dataTestSubj}
  />
);

interface ViewKiSidebarBreakableTextProps {
  children: React.ReactNode;
  title?: string;
}

export const ViewKiSidebarBreakableText = ({
  children,
  title,
}: ViewKiSidebarBreakableTextProps) => {
  const tooltipTitle = title ?? (typeof children === 'string' ? children : undefined);

  return (
    <EuiTextBlockTruncate
      lines={VIEW_KI_SIDEBAR_VALUE_MAX_LINES}
      className="eui-textBreakWord"
      title={tooltipTitle}
    >
      {children}
    </EuiTextBlockTruncate>
  );
};

interface ViewKiSidebarWriterValueProps {
  value: string;
  href?: string;
}

const ViewKiSidebarWriterValue = ({ value, href }: ViewKiSidebarWriterValueProps) => {
  if (href) {
    return (
      <EuiLink href={href} className="eui-textBreakWord">
        {value}
      </EuiLink>
    );
  }

  return <EuiCode transparentBackground>{value}</EuiCode>;
};

interface ViewKiSidebarWriterProvenanceProps {
  writer: KiGovernanceWriter;
}

export const ViewKiSidebarWriterProvenance = ({ writer }: ViewKiSidebarWriterProvenanceProps) => {
  const {
    services: { application },
  } = useKibana();
  const { getUrlForApp } = application;

  const parsed = parseWriterUri(writer.uri);
  const agentId = getWriterAgentId(writer.metadata);
  const agentHref = useMemo(
    () => (agentId ? getKiWriterAgentManageHref(getUrlForApp, agentId) : undefined),
    [agentId, getUrlForApp]
  );
  const writerHref = useMemo(
    () => getKiWriterUriHref(getUrlForApp, writer.uri),
    [getUrlForApp, writer.uri]
  );

  const agentNode = agentId ? <ViewKiSidebarWriterValue value={agentId} href={agentHref} /> : null;
  const agentTooltip = agentId
    ? i18n.translate('xpack.contextEngine.viewKi.writerProvenance.agentTooltip', {
        defaultMessage: 'agent {agentId}',
        values: { agentId },
      })
    : undefined;

  // Parsed writer URIs (e.g. workflow://id, tool://id) render as "{scheme} {identifier}";
  // anything else renders as-is.
  const writerNode = parsed ? (
    <FormattedMessage
      id="xpack.contextEngine.viewKi.writerProvenance.schemeDetail"
      defaultMessage="{scheme} {identifier}"
      values={{
        scheme: <span>{parsed.scheme.toLowerCase()}</span>,
        identifier: <ViewKiSidebarWriterValue value={parsed.identifier} href={writerHref} />,
      }}
    />
  ) : writer.uri.length > 0 ? (
    <ViewKiSidebarWriterValue value={writer.uri} href={writerHref} />
  ) : null;
  const writerTooltip = parsed
    ? i18n.translate('xpack.contextEngine.viewKi.writerProvenance.schemeTooltip', {
        defaultMessage: '{scheme} {identifier}',
        values: { scheme: parsed.scheme.toLowerCase(), identifier: parsed.identifier },
      })
    : writer.uri.length > 0
    ? writer.uri
    : undefined;

  const tooltip = [agentTooltip, writerTooltip].filter(Boolean).join(' · ');

  if (agentNode && writerNode) {
    return (
      <span title={tooltip}>
        <FormattedMessage
          id="xpack.contextEngine.viewKi.writerProvenance.agentWithWriterDetail"
          defaultMessage="agent {agent} with {writer}"
          values={{ agent: agentNode, writer: writerNode }}
        />
      </span>
    );
  }

  if (agentNode) {
    return (
      <span title={tooltip}>
        <FormattedMessage
          id="xpack.contextEngine.viewKi.writerProvenance.agentOnlyDetail"
          defaultMessage="agent {agent}"
          values={{ agent: agentNode }}
        />
      </span>
    );
  }

  return <span title={tooltip}>{writerNode}</span>;
};
