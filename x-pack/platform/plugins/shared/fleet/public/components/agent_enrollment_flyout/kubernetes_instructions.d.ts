import React from 'react';
interface Props {
    enrollmentAPIKey?: string;
    onCopy?: () => void;
    onDownload?: () => void;
    fleetServerHost?: string;
}
export declare const getManifestDownloadLink: (fleetServerHost?: string, enrollmentAPIKey?: string) => string;
export declare const KubernetesInstructions: React.FunctionComponent<Props>;
export {};
