/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OAuthClientLogo } from '@kbn/agent-builder-common';
import { dataUrlToFile, fetchAsDataUrl, parseDataUrl } from '../../../utils/data_url';
import type { LogoOption } from './mcp_logo_options';
import { LOGO_OPTIONS } from './mcp_logo_options';
import type { ClientLogo } from './types';
import { NO_CLIENT_LOGO } from './types';

const FALLBACK_LOGO_FILE_NAME = 'logo';

const logoFileName = (mediaType: string): string => {
  const [, subtype] = mediaType.split('/');
  return subtype ? `${FALLBACK_LOGO_FILE_NAME}.${subtype}` : FALLBACK_LOGO_FILE_NAME;
};

const loadPresetLogoData = async (option: LogoOption): Promise<string | undefined> => {
  try {
    const dataUrl = await fetchAsDataUrl(await option.loadIconUrl());
    return parseDataUrl(dataUrl)?.data;
  } catch {
    return undefined;
  }
};

let presetLogoDataById: Promise<ReadonlyMap<string, string>> | undefined;

const buildPresetLogoDataById = async (): Promise<ReadonlyMap<string, string>> => {
  const dataById = new Map<string, string>();
  let hasFailure = false;

  await Promise.all(
    Object.entries(LOGO_OPTIONS).map(async ([id, option]) => {
      const data = await loadPresetLogoData(option);
      if (data === undefined) {
        hasFailure = true;
        return;
      }
      dataById.set(id, data);
    })
  );

  if (hasFailure) {
    presetLogoDataById = undefined;
  }

  return dataById;
};

const findPresetLogoId = async (data: string): Promise<string | undefined> => {
  presetLogoDataById ??= buildPresetLogoDataById();
  const dataById = await presetLogoDataById;

  for (const [id, presetData] of dataById) {
    if (presetData === data) {
      return id;
    }
  }
  return undefined;
};

/**
 * Maps a client's stored logo onto the form's logo field.
 *
 * @param clientLogo - The client's stored `client_logo`, if any.
 * @returns A `select` variant when the logo matches one of the presets, an
 *   `upload` variant carrying a file reconstructed from the stored bytes
 *   otherwise, and no logo when there is nothing to prefill.
 */
export const resolveClientLogoFormValue = async (
  clientLogo?: OAuthClientLogo
): Promise<ClientLogo> => {
  if (!clientLogo || clientLogo.data === '') {
    return NO_CLIENT_LOGO;
  }

  const dataUrl = `data:${clientLogo.media_type};base64,${clientLogo.data}`;

  const presetId = await findPresetLogoId(clientLogo.data);
  if (presetId) {
    return { type: 'select', id: presetId, dataUrl };
  }

  const file = dataUrlToFile(dataUrl, logoFileName(clientLogo.media_type));
  return file ? { type: 'upload', file, dataUrl } : NO_CLIENT_LOGO;
};
