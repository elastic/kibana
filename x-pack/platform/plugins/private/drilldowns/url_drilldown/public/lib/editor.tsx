/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef } from 'react';
import { css } from '@emotion/react';
import type { EuiSwitchEvent } from '@elastic/eui';
import {
  EuiFormRow,
  EuiLink,
  EuiAccordion,
  EuiSpacer,
  EuiPanel,
  EuiSwitch,
  EuiTextColor,
} from '@elastic/eui';
import type { monaco } from '@kbn/monaco';
import type { UrlTemplateEditorVariable } from '@kbn/kibana-react-plugin/public';
import { UrlTemplateEditor } from '@kbn/kibana-react-plugin/public';
import type { DrilldownEditorProps } from '@kbn/embeddable-plugin/public';
import type { UrlDrilldownState } from '../../server';
import {
  txtUrlTemplateSyntaxHelpLinkText,
  txtUrlTemplateLabel,
  txtUrlTemplateAdditionalOptions,
  txtEmptyErrorMessage,
  txtInvalidFormatErrorMessage,
  txtUrlTemplateSyntaxTestingHelpText,
  txtUrlTemplateOpenInNewTab,
  txtUrlTemplateEncodeUrl,
  txtUrlTemplateEncodeDescription,
} from './i18n';
import { VariablePopover } from './variables/components/variable_popover';
import { DEFAULT_ENCODE_URL, DEFAULT_OPEN_IN_NEW_TAB } from '../../common/constants';
import { validateUrl } from './variables/url_validation/url_validation';

type Props = DrilldownEditorProps<UrlDrilldownState> & {
  variables: UrlTemplateEditorVariable[];
  exampleUrl: string;
  syntaxHelpDocsLink?: string;
  variablesHelpDocsLink?: string;
};

const isCursorBetweenDoubleCurlyBrackets = (editor: monaco.editor.IStandaloneCodeEditor) => {
  const model = editor.getModel();
  const position = editor.getPosition();
  if (!model || !position) return false;

  const offset = model.getOffsetAt(position);
  const text = model.getValue();
  const twoCharactersBeforeOffset = text.slice(offset - 2, offset);
  const twoCharactersAfterOffset = text.slice(offset, offset + 2);

  return twoCharactersBeforeOffset === '{{' && twoCharactersAfterOffset === '}}';
};

export const UrlDrilldownEditor: React.FC<Props> = ({
  state,
  variables,
  exampleUrl,
  onChange,
  syntaxHelpDocsLink,
  variablesHelpDocsLink,
}) => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [isPristine, setIsPristine] = React.useState(true);
  const urlTemplate = state.url ?? '';

  function updateUrlTemplate(newUrlTemplate: string) {
    if (state.url !== newUrlTemplate) {
      setIsPristine(false);
      onChange({
        ...state,
        url: newUrlTemplate,
      });
    }
  }
  const isEmpty = !urlTemplate;

  const isValidUrlFormat = validateUrl(urlTemplate);
  const isInvalid = !isPristine && (isEmpty || !isValidUrlFormat.isValid);

  const invalidErrorMessage = isInvalid
    ? isEmpty
      ? txtEmptyErrorMessage
      : txtInvalidFormatErrorMessage({ error: isValidUrlFormat.error!, example: exampleUrl })
    : undefined;

  const variablesDropdown = (
    <VariablePopover
      variables={variables}
      variablesHelpLink={variablesHelpDocsLink}
      onSelect={(variable: string) => {
        const editor = editorRef.current;
        if (!editor) return;
        const text = isCursorBetweenDoubleCurlyBrackets(editor) ? variable : `{{${variable}}}`;

        editor.trigger('keyboard', 'type', {
          text,
        });
      }}
    />
  );

  return (
    <>
      <EuiFormRow
        fullWidth
        isInvalid={isInvalid}
        error={invalidErrorMessage}
        css={css({
          '.euiFormRow__label': {
            alignSelf: 'flex-end',
          },
        })}
        label={txtUrlTemplateLabel}
        helpText={
          <>
            {txtUrlTemplateSyntaxTestingHelpText}{' '}
            {syntaxHelpDocsLink ? (
              <EuiLink external target={'_blank'} href={syntaxHelpDocsLink}>
                {txtUrlTemplateSyntaxHelpLinkText}
              </EuiLink>
            ) : null}
          </>
        }
        labelAppend={variablesDropdown}
      >
        <UrlTemplateEditor
          fitToContent={{ minLines: 5, maxLines: 15 }}
          variables={variables}
          value={urlTemplate}
          placeholder={exampleUrl}
          onChange={(newUrlTemplate) => updateUrlTemplate(newUrlTemplate)}
          onEditor={(editor) => {
            editorRef.current = editor;
          }}
        />
      </EuiFormRow>
      <EuiSpacer size={'l'} />
      <EuiAccordion
        id="accordion_url_drilldown_additional_options"
        buttonContent={txtUrlTemplateAdditionalOptions}
        data-test-subj="urlDrilldownAdditionalOptions"
      >
        <EuiSpacer size={'s'} />
        <EuiPanel color="subdued" borderRadius="none" hasShadow={false} css={{ border: 'none' }}>
          <EuiFormRow>
            <div>
              <EuiSwitch
                compressed
                id="openInNewTab"
                name="openInNewTab"
                label={txtUrlTemplateOpenInNewTab}
                checked={state.open_in_new_tab ?? DEFAULT_OPEN_IN_NEW_TAB}
                onChange={(event: EuiSwitchEvent) =>
                  onChange({ ...state, open_in_new_tab: event.target.checked })
                }
                data-test-subj="urlDrilldownOpenInNewTab"
              />
              <EuiSpacer size="s" />
              <EuiSwitch
                compressed
                id="encodeUrl"
                name="encodeUrl"
                label={
                  <>
                    {txtUrlTemplateEncodeUrl}
                    <EuiSpacer size={'s'} />
                    <EuiTextColor color="subdued">{txtUrlTemplateEncodeDescription}</EuiTextColor>
                  </>
                }
                checked={state.encode_url ?? DEFAULT_ENCODE_URL}
                onChange={(event: EuiSwitchEvent) =>
                  onChange({ ...state, encode_url: event.target.checked })
                }
                data-test-subj="urlDrilldownEncodeUrl"
              />
            </div>
          </EuiFormRow>
        </EuiPanel>
      </EuiAccordion>
    </>
  );
};
