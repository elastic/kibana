/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useRef } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiEmptyPrompt, EuiSpacer, EuiLink } from '@elastic/eui';
import { useKibana } from '../../../../shared_imports';
import { usePipelineProcessorsContext } from '../context';
import { AddProcessorButton } from './add_processor_button';
import type { OnDoneLoadJsonHandler } from './load_from_json';
import { LoadFromJsonButton } from './load_from_json';

const i18nTexts = {
  emptyPromptTitle: i18n.translate('xpack.ingestPipelines.pipelineEditor.emptyPrompt.title', {
    defaultMessage: 'Add your first processor',
  }),
};

export interface Props {
  onLoadJson: OnDoneLoadJsonHandler;
}

export const ProcessorsEmptyPrompt: FunctionComponent<Props> = ({ onLoadJson }) => {
  const { onTreeAction } = usePipelineProcessorsContext();
  const { services } = useKibana();

  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <EuiEmptyPrompt
      title={<h2>{i18nTexts.emptyPromptTitle}</h2>}
      data-test-subj="processorsEmptyPrompt"
      body={
        <p>
          <FormattedMessage
            id="xpack.ingestPipelines.pipelineEditor.emptyPrompt.description"
            defaultMessage="Use processors to transform data before indexing. {learnMoreLink}"
            values={{
              learnMoreLink: (
                <EuiLink href={services.documentation.getProcessorsUrl()} target="_blank" external>
                  {i18n.translate(
                    'xpack.ingestPipelines.pipelineEditor.processorsDocumentationLink',
                    {
                      defaultMessage: 'Learn more.',
                    }
                  )}
                </EuiLink>
              ),
            }}
          />
        </p>
      }
      actions={
        <>
          <AddProcessorButton
            ref={buttonRef}
            onClick={() => {
              onTreeAction({
                type: 'addProcessor',
                payload: { target: ['processors'], buttonRef },
              });
            }}
          />

          <EuiSpacer size="m" />

          <LoadFromJsonButton onDone={onLoadJson} />
        </>
      }
    />
  );
};
