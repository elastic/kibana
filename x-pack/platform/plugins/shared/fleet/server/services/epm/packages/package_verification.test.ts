/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFile } from 'fs/promises';

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';

const mockLoggerFactory = loggingSystemMock.create();
const mockLogger = mockLoggerFactory.get('mock logger');
import { getGpgKeyOrUndefined, _readGpgKey } from './package_verification';

const testGpgKeyId = 'd27d666cd88e42b4';
const testGpgKey = `
-----BEGIN PGP PUBLIC KEY BLOCK-----
Version: GnuPG v2.0.14 (GNU/Linux)

mQENBFI3HsoBCADXDtbNJnxbPqB1vDNtCsqhe49vFYsZN9IOZsZXgp7aHjh6CJBD
A+bGFOwyhbd7at35jQjWAw1O3cfYsKAmFy+Ar3LHCMkV3oZspJACTIgCrwnkic/9
CUliQe324qvObU2QRtP4Fl0zWcfb/S8UYzWXWIFuJqMvE9MaRY1bwUBvzoqavLGZ
j3SF1SPO+TB5QrHkrQHBsmX+Jda6d4Ylt8/t6CvMwgQNlrlzIO9WT+YN6zS+sqHd
1YK/aY5qhoLNhp9G/HxhcSVCkLq8SStj1ZZ1S9juBPoXV1ZWNbxFNGwOh/NYGldD
2kmBf3YgCqeLzHahsAEpvAm8TBa7Q9W21C8vABEBAAG0RUVsYXN0aWNzZWFyY2gg
KEVsYXN0aWNzZWFyY2ggU2lnbmluZyBLZXkpIDxkZXZfb3BzQGVsYXN0aWNzZWFy
Y2gub3JnPokBOAQTAQIAIgUCUjceygIbAwYLCQgHAwIGFQgCCQoLBBYCAwECHgEC
F4AACgkQ0n1mbNiOQrRzjAgAlTUQ1mgo3nK6BGXbj4XAJvuZDG0HILiUt+pPnz75
nsf0NWhqR4yGFlmpuctgCmTD+HzYtV9fp9qW/bwVuJCNtKXk3sdzYABY+Yl0Cez/
7C2GuGCOlbn0luCNT9BxJnh4mC9h/cKI3y5jvZ7wavwe41teqG14V+EoFSn3NPKm
TxcDTFrV7SmVPxCBcQze00cJhprKxkuZMPPVqpBS+JfDQtzUQD/LSFfhHj9eD+Xe
8d7sw+XvxB2aN4gnTlRzjL1nTRp0h2/IOGkqYfIG9rWmSLNlxhB2t+c0RsjdGM4/
eRlPWylFbVMc5pmDpItrkWSnzBfkmXL3vO2X3WvwmSFiQbkBDQRSNx7KAQgA5JUl
zcMW5/cuyZR8alSacKqhSbvoSqqbzHKcUQZmlzNMKGTABFG1yRx9r+wa/fvqP6OT
RzRDvVS/cycws8YX7Ddum7x8uI95b9ye1/Xy5noPEm8cD+hplnpU+PBQZJ5XJ2I+
1l9Nixx47wPGXeClLqcdn0ayd+v+Rwf3/XUJrvccG2YZUiQ4jWZkoxsA07xx7Bj+
Lt8/FKG7sHRFvePFU0ZS6JFx9GJqjSBbHRRkam+4emW3uWgVfZxuwcUCn1ayNgRt
KiFv9jQrg2TIWEvzYx9tywTCxc+FFMWAlbCzi+m4WD+QUWWfDQ009U/WM0ks0Kww
EwSk/UDuToxGnKU2dQARAQABiQEfBBgBAgAJBQJSNx7KAhsMAAoJENJ9ZmzYjkK0
c3MIAIE9hAR20mqJWLcsxLtrRs6uNF1VrpB+4n/55QU7oxA1iVBO6IFu4qgsF12J
TavnJ5MLaETlggXY+zDef9syTPXoQctpzcaNVDmedwo1SiL03uMoblOvWpMR/Y0j
6rm7IgrMWUDXDPvoPGjMl2q1iTeyHkMZEyUJ8SKsaHh4jV9wp9KmC8C+9CwMukL7
vM5w8cgvJoAwsp3Fn59AxWthN3XJYcnMfStkIuWgR7U2r+a210W6vnUxU4oN0PmM
cursYPyeV0NX/KQeUeNMwGTFB6QHS/anRaGQewijkrYYoTNtfllxIu9XYmiBERQ/
qPDlGRlOgVTd9xUfHFkzB52c70E=
=92oX
-----END PGP PUBLIC KEY BLOCK-----
`;
const testGpgKeyFileContent = Buffer.from(testGpgKey);

// RSA keys shorter than 2047 bits are rejected by openpgp's default config
const weakGpgKey = `
-----BEGIN PGP PUBLIC KEY BLOCK-----

xo0EauPeAAEEALkukURtOwM52q+w1v/u5xusufo6cOAjf26XspT+gVyblTuQ
7hjv1r6HquZ8uQl1S2N+MdSQdUgNRAFkvt7QAzkhRBPCtnocrXYPpQ+Zlk9i
DKb28AB/sz/4bjGso79HpbOhilJ2VgTfn0RivlRIvX69LalB0yDXEhBaaoKo
PjElABEBAAHNCFdlYWsgS2V5wsBRBBMBCgCFBYJq494AAwsJBwkQ0K5DshL1
dVZFFAAAAAAAHAAgc2FsdEBub3RhdGlvbnMub3BlbnBncGpzLm9yZ6z+nghp
xHYV0UVX4ZO/340vikb0+E73rnOa9OKdvFXfBRUKCA4MBBYAAgECGQECmwMC
HgEWIQSLfWvxJsP/u9GJu23QrkOyEvV1VgAAGjgEALY2JMBw8N/uA7j/Ttfh
UeGfdJGIimq7LqCHw84RSVSwe71Hvjaj44jQ1ltxU5l9oWgPoIcgYMYQ30T/
KG2Q3DYOgWCNDI5Dg3lEPRaXAiYk/KZG/0IAnKfL+1I6jYUBt1j96d2rCJ/F
n0nGmD5X/Jj6HkjLKYkK4azGq5Xo78GLzo0EauPeAAEEAKiGnCXqB7qcmyBb
MCY8FtUsd8d2Q5SYey810KwnjkFRuPHAczx7pWltyqikExGPR2Eei5dcaK2f
1oAx1L0wm1VALUrSfDKUVFkG6HRtZbtFLcDNkYtutgN2KoCJyL7GVrxp3/SX
5zokQAof7kLo0fjQcShOU4fVaxt5HShKEVtlABEBAAHCwDwEGAEKAHAFgmrj
3gAJENCuQ7IS9XVWRRQAAAAAABwAIHNhbHRAbm90YXRpb25zLm9wZW5wZ3Bq
cy5vcmctFG1JEm9KBIvBBBIGxirzBUurX4No8LDkBVeTAYku/wKbDBYhBIt9
a/Emw/+70Ym7bdCuQ7IS9XVWAABO0gQAttLHIdWd0eVoravDVYcrOWAn4/g2
4O+0wopo8EROYCv7xLPEokP++6G387MCz7Y7llleifPHppuOroXIVJZRVTl9
cBcgVgBeYCqDehQbk+4xrnRkUXa0q3KzRlt9+uQ/i7yQMEDevGe1S9dkCg3O
0vldKmYTlu2Z2K9idPE/KvY=
=WR+/
-----END PGP PUBLIC KEY BLOCK-----
`;
const weakGpgKeyFileContent = Buffer.from(weakGpgKey);

const mockGetConfig = jest.fn();
jest.mock('../../app_context', () => ({
  appContextService: {
    getConfig: () => mockGetConfig(),
    getLogger: () => mockLogger,
  },
}));

jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
}));

const mockedReadFile = readFile as jest.MockedFunction<typeof readFile>;

beforeEach(() => {
  jest.resetAllMocks();
});
describe('getGpgKeyOrUndefined', () => {
  it('should cache the gpg key after reading file once', async () => {
    mockedReadFile.mockResolvedValue(testGpgKeyFileContent);
    mockGetConfig.mockReturnValue({ packageVerification: { gpgKeyPath: 'somePath' } });
    const key1 = await getGpgKeyOrUndefined();
    const key2 = await getGpgKeyOrUndefined();
    expect(key1?.getKeyID().toHex()).toEqual(testGpgKeyId);
    expect(key2?.getKeyID().toHex()).toEqual(testGpgKeyId);
    expect(mockedReadFile).toHaveBeenCalledWith('somePath');
    expect(mockedReadFile).toHaveBeenCalledTimes(1);
  });
});

describe('_readGpgKey', () => {
  it('should return undefined if the key file isnt configured', async () => {
    mockedReadFile.mockResolvedValue(testGpgKeyFileContent);
    mockGetConfig.mockReturnValue({ packageVerification: {} });

    expect(await _readGpgKey()).toEqual(undefined);
  });
  it('should return undefined if there is an error reading the file', async () => {
    mockedReadFile.mockRejectedValue(new Error('some error'));
    mockGetConfig.mockReturnValue({ packageVerification: { gpgKeyPath: 'somePath' } });
    expect(await _readGpgKey()).toEqual(undefined);
    expect(mockedReadFile).toHaveBeenCalledWith('somePath');
  });
  it('should return the key without warning if it can be used for verification', async () => {
    mockedReadFile.mockResolvedValue(testGpgKeyFileContent);
    mockGetConfig.mockReturnValue({ packageVerification: { gpgKeyPath: 'somePath' } });

    const key = await _readGpgKey();

    expect(key?.getKeyID().toHex()).toEqual(testGpgKeyId);
    expect(mockLogger.warn).not.toHaveBeenCalled();
  });
  it('should return the key and warn if it cannot be used for verification', async () => {
    mockedReadFile.mockResolvedValue(weakGpgKeyFileContent);
    mockGetConfig.mockReturnValue({ packageVerification: { gpgKeyPath: 'somePath' } });

    const key = await _readGpgKey();

    expect(key).toBeDefined();
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining("GPG key from 'somePath' cannot be used to verify package signatures")
    );
  });
});
