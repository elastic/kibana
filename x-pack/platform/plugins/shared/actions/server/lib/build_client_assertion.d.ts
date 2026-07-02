import type { JwtAlgorithm } from '@kbn/connector-specs';
export type CertificateBinding = {
    kind: 'x5t#S256';
    certificate: string;
} | {
    kind: 'x5c';
    certificate: string;
} | {
    kind: 'kid';
    keyId: string;
};
export interface BuildClientAssertionOpts {
    tokenUrl: string;
    clientId: string;
    algorithm: JwtAlgorithm;
    certificateBinding: CertificateBinding;
    privateKey: string;
    passphrase?: string;
}
export declare function computeCertificateThumbprint(pemCert: string): string;
export declare function buildClientAssertion({ tokenUrl, clientId, algorithm, certificateBinding, privateKey, passphrase, }: BuildClientAssertionOpts): string;
