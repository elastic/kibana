/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import actionCreatorFactory from 'typescript-fsa';
import { reducerWithInitialState } from 'typescript-fsa-reducers/dist';
import { i18n } from '@kbn/i18n';
import { modifyUrl } from '@kbn/std';
import rison from '@kbn/rison';
import { format, parse } from 'url';
import { v4 as uuidv4 } from 'uuid';
import type { GraphState } from './store';
import type { UrlTemplate } from '../types';
import { reset } from './global';
import type { IndexpatternDatasource } from './datasource';
import { setDatasource, requestDatasource } from './datasource';
import { outlinkEncoders } from '../helpers/outlink_encoders';
import { urlTemplatePlaceholder } from '../helpers/url_template';

const actionCreator = actionCreatorFactory('x-pack/graph/urlTemplates');

const loadTemplatesAction = actionCreator<UrlTemplateState[]>('LOAD_TEMPLATES');
const saveTemplateAction = actionCreator<{
  id: string;
  isNew: boolean;
  template: UrlTemplate;
}>('SAVE_TEMPLATE');
export const removeTemplate = actionCreator<string>('REMOVE_TEMPLATE');

export const loadTemplates = (templates: UrlTemplate[]) =>
  loadTemplatesAction(templates.map((template) => ({ ...template, id: uuidv4() })));

export const saveTemplate = ({ id, template }: { id?: string; template: UrlTemplate }) =>
  saveTemplateAction({ id: id ?? uuidv4(), isNew: id === undefined, template });

export interface UrlTemplateState extends UrlTemplate {
  id: string;
}

export type UrlTemplatesState = UrlTemplateState[];

const initialTemplates: UrlTemplatesState = [];

function generateDefaultTemplate(
  datasource: IndexpatternDatasource,
  addBasePath: (url: string) => string
): UrlTemplateState {
  const appPath = modifyUrl('/', (parsed) => {
    parsed.query._a = rison.encode({
      columns: ['_source'],
      index: datasource.id,
      interval: 'auto',
      query: { language: 'kuery', query: urlTemplatePlaceholder },
      sort: ['_score', 'desc'],
    });
  });
  const parsedAppPath = parse(`/app/discover#${appPath}`, true, true);
  const formattedAppPath = format({
    protocol: parsedAppPath.protocol,
    host: parsedAppPath.host,
    pathname: parsedAppPath.pathname,
    query: parsedAppPath.query,
    hash: parsedAppPath.hash,
  });

  // replace the URI encoded version of the tag with the unescaped version
  // so it can be found with String.replace, regexp, etc.
  const discoverUrl = addBasePath(formattedAppPath).replace(
    encodeURIComponent(urlTemplatePlaceholder),
    urlTemplatePlaceholder
  );

  return {
    id: `graph-default-url-template-${datasource.id}`,
    url: discoverUrl,
    description: i18n.translate('xpack.graph.settings.drillDowns.defaultUrlTemplateTitle', {
      defaultMessage: 'Raw documents',
    }),
    encoder: outlinkEncoders[0],
    isDefault: true,
    icon: null,
  };
}

export const urlTemplatesReducer = (addBasePath: (url: string) => string) =>
  reducerWithInitialState(initialTemplates)
    .case(reset, () => initialTemplates)
    .cases([requestDatasource, setDatasource], (templates, datasource) => {
      if (datasource.type === 'none') {
        return initialTemplates;
      }
      const customTemplates = templates.filter((template) => !template.isDefault);
      return [...customTemplates, generateDefaultTemplate(datasource, addBasePath)];
    })
    .case(loadTemplatesAction, (_currentTemplates, newTemplates) => {
      return newTemplates.map((template) => ({
        ...template,
        ...(template.isDefault && template.url?.startsWith('/app/discover') // as in saved objects of sample data sets
          ? {
              url: addBasePath(template.url).replace(
                encodeURIComponent(urlTemplatePlaceholder),
                urlTemplatePlaceholder
              ),
            }
          : {}),
      }));
    })
    .case(saveTemplateAction, (templates, { id, isNew, template: updatedTemplate }) => {
      // set default flag to false as soon as template is overwritten.
      return isNew
        ? [...templates, { ...updatedTemplate, id, isDefault: false }]
        : templates.map((template) =>
            template.id === id
              ? { ...updatedTemplate, id: template.id, isDefault: false }
              : template
          );
    })
    .case(removeTemplate, (templates, idToDelete) =>
      templates.filter((template) => template.id !== idToDelete)
    )
    .build();

export const templatesSelector = (state: GraphState) => state.urlTemplates;
