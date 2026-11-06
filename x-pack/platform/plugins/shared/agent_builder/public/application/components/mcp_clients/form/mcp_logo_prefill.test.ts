/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseDataUrl } from '../../../utils/data_url';
import { LOGO_OPTIONS } from './mcp_logo_options';
import { resolveClientLogoFormValue } from './mcp_logo_prefill';

// Jest resolves image imports to a shared stub, so the real preset assets are
// not data URLs here and every option would appear to hold identical bytes.
jest.mock('./mcp_logo_options', () => ({
  LOGO_OPTIONS: {
    mcp_client: {
      label: 'MCP client logo',
      isDefault: true,
      loadIconUrl: () => Promise.resolve('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB'),
    },
    claude: {
      label: 'Claude',
      loadIconUrl: () => Promise.resolve('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAAC'),
    },
    unavailable: {
      label: 'Unavailable',
      loadIconUrl: () => Promise.reject(new Error('failed to load')),
    },
  },
}));

const presetLogoData = async (id: string): Promise<string> => {
  const dataUrl = await LOGO_OPTIONS[id].loadIconUrl();
  return parseDataUrl(dataUrl)?.data ?? '';
};

describe('resolveClientLogoFormValue', () => {
  it('returns no logo when the client has none stored', async () => {
    await expect(resolveClientLogoFormValue(undefined)).resolves.toEqual({ type: 'none' });
  });

  it('returns no logo when the stored payload is empty', async () => {
    await expect(
      resolveClientLogoFormValue({ media_type: 'image/png', data: '' })
    ).resolves.toEqual({ type: 'none' });
  });

  it('returns a select variant when the stored bytes match a preset', async () => {
    const data = await presetLogoData('claude');

    await expect(resolveClientLogoFormValue({ media_type: 'image/png', data })).resolves.toEqual({
      type: 'select',
      id: 'claude',
      dataUrl: `data:image/png;base64,${data}`,
    });
  });

  it('returns an upload variant with a reconstructed file when no preset matches', async () => {
    const data = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAA';

    const clientLogo = await resolveClientLogoFormValue({ media_type: 'image/gif', data });

    expect(clientLogo.type).toBe('upload');
    if (clientLogo.type !== 'upload') {
      return;
    }
    expect(clientLogo.dataUrl).toBe(`data:image/gif;base64,${data}`);
    expect(clientLogo.file.name).toBe('logo.gif');
    expect(clientLogo.file.type).toBe('image/gif');
    expect(clientLogo.file.size).toBeGreaterThan(0);
  });

  it('returns no logo when the stored payload is not valid base64', async () => {
    await expect(
      resolveClientLogoFormValue({ media_type: 'image/png', data: 'not-base64-@@@' })
    ).resolves.toEqual({ type: 'none' });
  });
});
