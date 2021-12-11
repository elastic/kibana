/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import tls from 'tls';

export async function getElasticsearchCaCertificate(host: string, port: string) {
  let peerCertificate = await new Promise<tls.DetailedPeerCertificate>((resolve, reject) => {
    const socket = tls.connect({ host, port: Number(port), rejectUnauthorized: false });
    socket.once('secureConnect', () => {
      const cert = socket.getPeerCertificate(true);
      socket.destroy();
      resolve(cert);
    });
    socket.once('error', reject);
  });

  while (
    peerCertificate.issuerCertificate &&
    peerCertificate.fingerprint256 !== peerCertificate.issuerCertificate.fingerprint256
  ) {
    peerCertificate = peerCertificate.issuerCertificate;
  }

  return peerCertificate;
}
