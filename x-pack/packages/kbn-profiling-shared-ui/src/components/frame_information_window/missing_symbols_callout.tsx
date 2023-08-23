/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiCallOut, EuiLink } from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { FrameType, getLanguageType } from '@kbn/profiling-data-access-plugin/common/profiling';
import { AddDataTabs, PROFILING_FEEDBACK_LINK } from '../../../common';

interface Props {
  frameType: FrameType;
  elasticWebsiteUrl: string;
  dockLinkVersion: string;
  onUploadSymbolsClick: (tab: AddDataTabs) => void;
}

export function MissingSymbolsCallout({
  frameType,
  dockLinkVersion,
  elasticWebsiteUrl,
  onUploadSymbolsClick,
}: Props) {
  const languageType = getLanguageType({ frameType });

  if (languageType === 'NATIVE') {
    return (
      <EuiCallOut
        title={i18n.translate(
          'xpack.profiling.frameInformationWindow.missingSymbols.native.title',
          { defaultMessage: 'Missing symbols' }
        )}
        color="warning"
        iconType="help"
      >
        <p>
          <FormattedMessage
            id="xpack.profiling.frameInformationWindow.missingSymbols.native"
            defaultMessage="To see function names and line numbers in traces of applications written in programming languages that compile to native code (C, C++, Rust, Go, etc.), you need to push symbols to the cluster using the elastic-profiling binary. {readMore}, or download the binary below."
            values={{
              readMore: (
                <EuiLink
                  href={`${elasticWebsiteUrl}/guide/en/observability/${dockLinkVersion}/profiling-add-symbols.html`}
                  target="_blank"
                >
                  {i18n.translate(
                    'xpack.profiling.frameInformationWindow.missingSymbols.native.readMore',
                    { defaultMessage: 'Read more' }
                  )}
                </EuiLink>
              ),
            }}
          />
        </p>
        <EuiButton
          onClick={() => {
            onUploadSymbolsClick(AddDataTabs.Symbols);
          }}
          color="warning"
        >
          {i18n.translate(
            'xpack.profiling.frameInformationWindow.missingSymbols.native.downloadBinary',
            { defaultMessage: 'Upload Symbols' }
          )}
        </EuiButton>
      </EuiCallOut>
    );
  }

  return (
    <EuiCallOut
      title={i18n.translate(
        'xpack.profiling.frameInformationWindow.missingSymbols.interpreted.title',
        { defaultMessage: 'Missing symbols error' }
      )}
      color="warning"
      iconType="help"
    >
      <p>
        {i18n.translate('xpack.profiling.frameInformationWindow.missingSymbols.interpreted', {
          defaultMessage:
            'Symbols are not available because of an error in the unwinder for this language or an unknown error with the interpreter.',
        })}
      </p>
      <EuiButton href={PROFILING_FEEDBACK_LINK} target="_blank" color="warning">
        {i18n.translate(
          'xpack.profiling.frameInformationWindow.missingSymbols.interpreted.reportProblem',
          { defaultMessage: 'Report a problem' }
        )}
      </EuiButton>
    </EuiCallOut>
  );
}
