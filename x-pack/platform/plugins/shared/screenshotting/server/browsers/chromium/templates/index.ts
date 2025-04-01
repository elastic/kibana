/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import fs from 'fs/promises';
import path from 'path';
import Handlebars from 'handlebars';
import { assetPath } from '../../../constants';

async function compileTemplate<T>(pathToTemplate: string): Promise<Handlebars.TemplateDelegate<T>> {
  const contentsBuffer = await fs.readFile(pathToTemplate);
  return Handlebars.compile(contentsBuffer.toString());
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

async function getDefaultFooterLogo(): Promise<string> {
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
