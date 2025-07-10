/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import fs from 'fs/promises';
import path from 'path';
import Handlebars, { TemplateDelegate } from '@kbn/handlebars';
import { assetPath } from '../../../constants';

// see: https://handlebarsjs.com/guide/builtin-helpers.html
const HBCompileOptions = {
  knownHelpersOnly: true,
  knownHelpers: {
    helperMissing: false,
    blockHelperMissing: false,
    each: false,
    if: true,
    unless: false,
    with: false,
    log: false,
    lookup: false,
  },
};

async function compileTemplate<T>(pathToTemplate: string): Promise<TemplateDelegate<T>> {
  const contentsBuffer = await fs.readFile(pathToTemplate);
  return Handlebars.compileAST(contentsBuffer.toString(), HBCompileOptions);
}

interface HeaderTemplateInput {
  title: string;
}
interface GetHeaderArgs {
  title: string;
}

export async function getHeaderTemplate({ title }: GetHeaderArgs): Promise<string> {
  const template = await compileTemplate<HeaderTemplateInput>(
    path.resolve(__dirname, './header.handlebars.html')
  );
  return template({ title });
}

export async function getDefaultFooterLogo(): Promise<string> {
  const logoBuffer = await fs.readFile(path.resolve(assetPath, 'img', 'logo-grey.png'));
  return `data:image/png;base64,${logoBuffer.toString('base64')}`;
}

interface FooterTemplateInput {
  base64FooterLogo: string;
  hasCustomLogo: boolean;
  poweredByElasticCopy: string;
}

interface GetFooterArgs {
  logo?: string;
}

export async function getFooterTemplate({ logo }: GetFooterArgs): Promise<string> {
  const template = await compileTemplate<FooterTemplateInput>(
    path.resolve(__dirname, './footer.handlebars.html')
  );
  const hasCustomLogo = Boolean(logo);
  return template({
    base64FooterLogo: hasCustomLogo ? logo! : await getDefaultFooterLogo(),
    hasCustomLogo,
    poweredByElasticCopy: i18n.translate(
      'xpack.screenshotting.exportTypes.printablePdf.footer.logoDescription',
      {
        defaultMessage: 'Powered by Elastic',
      }
    ),
  });
}
