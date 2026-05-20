export declare const errorMessage = "Warning: this API will cause a key pair to rotate and should not be necessary in normal operation.  If you proceed, you may need to reinstall Agents in your network. You must acknowledge the risks of rotating the key pair with acknowledge=true in the request parameters.  For more information, reach out to your administrator.";
export declare const RotateKeyPairSchema: {
    query: import("@kbn/config-schema").Type<Readonly<{} & {
        acknowledge: boolean;
    }> | undefined>;
};
