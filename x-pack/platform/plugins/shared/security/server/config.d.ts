import type { Duration } from 'moment';
import type { Type, TypeOf } from '@kbn/config-schema';
import type { AppenderConfigType, Logger } from '@kbn/core/server';
import type { AuthenticationProvider } from '../common';
export type ConfigType = ReturnType<typeof createConfig>;
type RawConfigType = TypeOf<typeof ConfigSchema>;
type ProvidersConfigType = TypeOf<typeof providersConfigSchema>;
declare const providersConfigSchema: import("@kbn/config-schema").ObjectType<{
    basic: Type<Record<string, Readonly<{
        description?: string | undefined;
        origin?: string | string[] | undefined;
        icon?: string | undefined;
        hint?: string | undefined;
        accessAgreement?: Readonly<{} & {
            message: string;
        }> | undefined;
    } & {
        order: number;
        session: {
            idleTimeout?: Duration | null;
            lifespan?: Duration | null;
        } | Readonly<{
            idleTimeout?: Duration | null | undefined;
            lifespan?: Duration | null | undefined;
        } & {}>;
        enabled: boolean;
        showInSelector: boolean;
    }>> | undefined>;
    token: Type<Record<string, Readonly<{
        description?: string | undefined;
        origin?: string | string[] | undefined;
        icon?: string | undefined;
        hint?: string | undefined;
        accessAgreement?: Readonly<{} & {
            message: string;
        }> | undefined;
    } & {
        order: number;
        session: {
            idleTimeout?: Duration | null;
            lifespan?: Duration | null;
        } | Readonly<{
            idleTimeout?: Duration | null | undefined;
            lifespan?: Duration | null | undefined;
        } & {}>;
        enabled: boolean;
        showInSelector: boolean;
    }>> | undefined>;
    kerberos: Type<Record<string, Readonly<{
        description?: string | undefined;
        origin?: string | string[] | undefined;
        icon?: string | undefined;
        hint?: string | undefined;
        accessAgreement?: Readonly<{} & {
            message: string;
        }> | undefined;
    } & {
        order: number;
        session: {
            idleTimeout?: Duration | null;
            lifespan?: Duration | null;
        } | Readonly<{
            idleTimeout?: Duration | null | undefined;
            lifespan?: Duration | null | undefined;
        } & {}>;
        enabled: boolean;
        showInSelector: boolean;
    }>> | undefined>;
    pki: Type<Record<string, Readonly<{
        description?: string | undefined;
        origin?: string | string[] | undefined;
        icon?: string | undefined;
        hint?: string | undefined;
        accessAgreement?: Readonly<{} & {
            message: string;
        }> | undefined;
    } & {
        order: number;
        session: {
            idleTimeout?: Duration | null;
            lifespan?: Duration | null;
        } | Readonly<{
            idleTimeout?: Duration | null | undefined;
            lifespan?: Duration | null | undefined;
        } & {}>;
        enabled: boolean;
        showInSelector: boolean;
    }>> | undefined>;
    saml: Type<Record<string, Readonly<{
        description?: string | undefined;
        origin?: string | string[] | undefined;
        icon?: string | undefined;
        hint?: string | undefined;
        accessAgreement?: Readonly<{} & {
            message: string;
        }> | undefined;
        maxRedirectURLSize?: import("@kbn/config-schema").ByteSizeValue | undefined;
    } & {
        realm: string;
        order: number;
        session: {
            idleTimeout?: Duration | null;
            lifespan?: Duration | null;
        } | Readonly<{
            idleTimeout?: Duration | null | undefined;
            lifespan?: Duration | null | undefined;
        } & {}>;
        enabled: boolean;
        showInSelector: boolean;
        useRelayStateDeepLink: boolean;
    }>> | undefined>;
    oidc: Type<Record<string, Readonly<{
        description?: string | undefined;
        origin?: string | string[] | undefined;
        icon?: string | undefined;
        hint?: string | undefined;
        accessAgreement?: Readonly<{} & {
            message: string;
        }> | undefined;
    } & {
        realm: string;
        order: number;
        session: {
            idleTimeout?: Duration | null;
            lifespan?: Duration | null;
        } | Readonly<{
            idleTimeout?: Duration | null | undefined;
            lifespan?: Duration | null | undefined;
        } & {}>;
        enabled: boolean;
        showInSelector: boolean;
    }>> | undefined>;
    anonymous: Type<Record<string, Readonly<{
        description?: string | undefined;
        origin?: string | string[] | undefined;
        icon?: string | undefined;
        hint?: string | undefined;
        accessAgreement?: Readonly<{} & {
            message: string;
        }> | undefined;
    } & {
        order: number;
        session: {
            idleTimeout?: Duration | null;
            lifespan?: Duration | null;
        } | Readonly<{
            idleTimeout?: Duration | null | undefined;
            lifespan?: Duration | null | undefined;
        } & {}>;
        enabled: boolean;
        showInSelector: boolean;
    }>> | undefined>;
}>;
export declare const ConfigSchema: import("@kbn/config-schema").ObjectType<{
    loginAssistanceMessage: Type<string>;
    showInsecureClusterWarning: Type<boolean>;
    loginHelp: Type<string | undefined>;
    showNavLinks: Type<boolean>;
    cookieName: Type<string>;
    encryptionKey: import("@kbn/config-schema").ConditionalType<true, string | undefined, string>;
    session: import("@kbn/config-schema").ObjectType<{
        idleTimeout: Type<Duration | null>;
        lifespan: Type<Duration | null>;
        cleanupInterval: Type<Duration>;
        concurrentSessions: Type<Readonly<{} & {
            maxSessions: number;
        }> | undefined>;
    }>;
    secureCookies: Type<boolean>;
    sameSiteCookies: Type<"None" | "Strict" | "Lax" | undefined>;
    public: import("@kbn/config-schema").ObjectType<{
        protocol: Type<"http" | "https" | undefined>;
        hostname: Type<string | undefined>;
        port: Type<number | undefined>;
    }>;
    accessAgreement: Type<Readonly<{} & {
        message: string;
    }> | undefined>;
    authc: import("@kbn/config-schema").ObjectType<{
        selector: import("@kbn/config-schema").ObjectType<{
            enabled: Type<boolean | undefined>;
        }>;
        providers: Type<string[] | Readonly<{
            basic?: Record<string, Readonly<{
                description?: string | undefined;
                origin?: string | string[] | undefined;
                icon?: string | undefined;
                hint?: string | undefined;
                accessAgreement?: Readonly<{} & {
                    message: string;
                }> | undefined;
            } & {
                order: number;
                session: {
                    idleTimeout?: Duration | null;
                    lifespan?: Duration | null;
                } | Readonly<{
                    idleTimeout?: Duration | null | undefined;
                    lifespan?: Duration | null | undefined;
                } & {}>;
                enabled: boolean;
                showInSelector: boolean;
            }>> | undefined;
            anonymous?: Record<string, Readonly<{
                description?: string | undefined;
                origin?: string | string[] | undefined;
                icon?: string | undefined;
                hint?: string | undefined;
                accessAgreement?: Readonly<{} & {
                    message: string;
                }> | undefined;
            } & {
                order: number;
                session: {
                    idleTimeout?: Duration | null;
                    lifespan?: Duration | null;
                } | Readonly<{
                    idleTimeout?: Duration | null | undefined;
                    lifespan?: Duration | null | undefined;
                } & {}>;
                enabled: boolean;
                showInSelector: boolean;
            }>> | undefined;
            token?: Record<string, Readonly<{
                description?: string | undefined;
                origin?: string | string[] | undefined;
                icon?: string | undefined;
                hint?: string | undefined;
                accessAgreement?: Readonly<{} & {
                    message: string;
                }> | undefined;
            } & {
                order: number;
                session: {
                    idleTimeout?: Duration | null;
                    lifespan?: Duration | null;
                } | Readonly<{
                    idleTimeout?: Duration | null | undefined;
                    lifespan?: Duration | null | undefined;
                } & {}>;
                enabled: boolean;
                showInSelector: boolean;
            }>> | undefined;
            kerberos?: Record<string, Readonly<{
                description?: string | undefined;
                origin?: string | string[] | undefined;
                icon?: string | undefined;
                hint?: string | undefined;
                accessAgreement?: Readonly<{} & {
                    message: string;
                }> | undefined;
            } & {
                order: number;
                session: {
                    idleTimeout?: Duration | null;
                    lifespan?: Duration | null;
                } | Readonly<{
                    idleTimeout?: Duration | null | undefined;
                    lifespan?: Duration | null | undefined;
                } & {}>;
                enabled: boolean;
                showInSelector: boolean;
            }>> | undefined;
            pki?: Record<string, Readonly<{
                description?: string | undefined;
                origin?: string | string[] | undefined;
                icon?: string | undefined;
                hint?: string | undefined;
                accessAgreement?: Readonly<{} & {
                    message: string;
                }> | undefined;
            } & {
                order: number;
                session: {
                    idleTimeout?: Duration | null;
                    lifespan?: Duration | null;
                } | Readonly<{
                    idleTimeout?: Duration | null | undefined;
                    lifespan?: Duration | null | undefined;
                } & {}>;
                enabled: boolean;
                showInSelector: boolean;
            }>> | undefined;
            saml?: Record<string, Readonly<{
                description?: string | undefined;
                origin?: string | string[] | undefined;
                icon?: string | undefined;
                hint?: string | undefined;
                accessAgreement?: Readonly<{} & {
                    message: string;
                }> | undefined;
                maxRedirectURLSize?: import("@kbn/config-schema").ByteSizeValue | undefined;
            } & {
                realm: string;
                order: number;
                session: {
                    idleTimeout?: Duration | null;
                    lifespan?: Duration | null;
                } | Readonly<{
                    idleTimeout?: Duration | null | undefined;
                    lifespan?: Duration | null | undefined;
                } & {}>;
                enabled: boolean;
                showInSelector: boolean;
                useRelayStateDeepLink: boolean;
            }>> | undefined;
            oidc?: Record<string, Readonly<{
                description?: string | undefined;
                origin?: string | string[] | undefined;
                icon?: string | undefined;
                hint?: string | undefined;
                accessAgreement?: Readonly<{} & {
                    message: string;
                }> | undefined;
            } & {
                realm: string;
                order: number;
                session: {
                    idleTimeout?: Duration | null;
                    lifespan?: Duration | null;
                } | Readonly<{
                    idleTimeout?: Duration | null | undefined;
                    lifespan?: Duration | null | undefined;
                } & {}>;
                enabled: boolean;
                showInSelector: boolean;
            }>> | undefined;
        } & {}>>;
        oidc: import("@kbn/config-schema").ConditionalType<Type<string[]>, any, never>;
        saml: import("@kbn/config-schema").ConditionalType<Type<string[]>, any, never>;
        http: import("@kbn/config-schema").ObjectType<{
            enabled: Type<boolean>;
            autoSchemesEnabled: Type<boolean>;
            schemes: Type<string[]>;
            jwt: import("@kbn/config-schema").ConditionalType<true, Readonly<{} & {
                taggedRoutesOnly: boolean;
            }>, Readonly<{} & {
                taggedRoutesOnly: boolean;
            }>>;
        }>;
    }>;
    audit: import("@kbn/config-schema").ObjectType<{
        enabled: Type<boolean>;
        include_saved_object_names: Type<boolean>;
        appender: Type<AppenderConfigType | undefined>;
        ignore_filters: Type<Readonly<{
            spaces?: string[] | undefined;
            users?: string[] | undefined;
            types?: string[] | undefined;
            actions?: string[] | undefined;
            categories?: string[] | undefined;
            outcomes?: string[] | undefined;
        } & {}>[] | undefined>;
    }>;
    roleManagementEnabled: import("@kbn/config-schema").ConditionalType<true, boolean, boolean>;
    ui: import("@kbn/config-schema").ConditionalType<true, Readonly<{} & {
        userManagementEnabled: boolean;
        roleMappingManagementEnabled: boolean;
    }>, Readonly<{} & {
        userManagementEnabled: boolean;
        roleMappingManagementEnabled: boolean;
    }>>;
    uiam: import("@kbn/config-schema").ConditionalType<true, Readonly<{
        url?: string | undefined;
        sharedSecret?: string | undefined;
    } & {
        enabled: boolean;
        ssl: Readonly<{
            key?: string | undefined;
            certificate?: string | undefined;
            certificateAuthorities?: string | string[] | undefined;
        } & {
            verificationMode: "none" | "full" | "certificate";
        }>;
    }>, Readonly<{
        url?: string | undefined;
        sharedSecret?: string | undefined;
    } & {
        enabled: boolean;
        ssl: Readonly<{
            key?: string | undefined;
            certificate?: string | undefined;
            certificateAuthorities?: string | string[] | undefined;
        } & {
            verificationMode: "none" | "full" | "certificate";
        }>;
    }>>;
    mcp: import("@kbn/config-schema").ConditionalType<true, Readonly<{} & {
        oauth2: Readonly<{} & {
            metadata: Readonly<{
                bearer_methods_supported?: ("query" | "body" | "header")[] | undefined;
                scopes_supported?: string[] | undefined;
                resource_documentation?: string | undefined;
            } & {
                resource: string;
                authorization_servers: string[];
            }>;
        }>;
    }> | undefined, Readonly<{} & {
        oauth2: Readonly<{} & {
            metadata: Readonly<{
                bearer_methods_supported?: ("query" | "body" | "header")[] | undefined;
                scopes_supported?: string[] | undefined;
                resource_documentation?: string | undefined;
            } & {
                resource: string;
                authorization_servers: string[];
            }>;
        }>;
    }> | undefined>;
    fipsMode: import("@kbn/config-schema").ObjectType<{
        enabled: Type<boolean>;
    }>;
}>;
export type UiamConfigType = TypeOf<typeof ConfigSchema>['uiam'];
export declare function createConfig(config: RawConfigType, logger: Logger, { isTLSEnabled }: {
    isTLSEnabled: boolean;
}): {
    audit: {
        appender?: AppenderConfigType | undefined;
        ignore_filters?: Readonly<{
            spaces?: string[] | undefined;
            users?: string[] | undefined;
            types?: string[] | undefined;
            actions?: string[] | undefined;
            categories?: string[] | undefined;
            outcomes?: string[] | undefined;
        } & {}>[] | undefined;
        enabled: boolean;
        include_saved_object_names: boolean;
    };
    authc: {
        selector: {
            enabled: boolean;
        };
        providers: Readonly<{
            basic?: Record<string, Readonly<{
                description?: string | undefined;
                origin?: string | string[] | undefined;
                icon?: string | undefined;
                hint?: string | undefined;
                accessAgreement?: Readonly<{} & {
                    message: string;
                }> | undefined;
            } & {
                order: number;
                session: {
                    idleTimeout?: Duration | null;
                    lifespan?: Duration | null;
                } | Readonly<{
                    idleTimeout?: Duration | null | undefined;
                    lifespan?: Duration | null | undefined;
                } & {}>;
                enabled: boolean;
                showInSelector: boolean;
            }>> | undefined;
            anonymous?: Record<string, Readonly<{
                description?: string | undefined;
                origin?: string | string[] | undefined;
                icon?: string | undefined;
                hint?: string | undefined;
                accessAgreement?: Readonly<{} & {
                    message: string;
                }> | undefined;
            } & {
                order: number;
                session: {
                    idleTimeout?: Duration | null;
                    lifespan?: Duration | null;
                } | Readonly<{
                    idleTimeout?: Duration | null | undefined;
                    lifespan?: Duration | null | undefined;
                } & {}>;
                enabled: boolean;
                showInSelector: boolean;
            }>> | undefined;
            token?: Record<string, Readonly<{
                description?: string | undefined;
                origin?: string | string[] | undefined;
                icon?: string | undefined;
                hint?: string | undefined;
                accessAgreement?: Readonly<{} & {
                    message: string;
                }> | undefined;
            } & {
                order: number;
                session: {
                    idleTimeout?: Duration | null;
                    lifespan?: Duration | null;
                } | Readonly<{
                    idleTimeout?: Duration | null | undefined;
                    lifespan?: Duration | null | undefined;
                } & {}>;
                enabled: boolean;
                showInSelector: boolean;
            }>> | undefined;
            kerberos?: Record<string, Readonly<{
                description?: string | undefined;
                origin?: string | string[] | undefined;
                icon?: string | undefined;
                hint?: string | undefined;
                accessAgreement?: Readonly<{} & {
                    message: string;
                }> | undefined;
            } & {
                order: number;
                session: {
                    idleTimeout?: Duration | null;
                    lifespan?: Duration | null;
                } | Readonly<{
                    idleTimeout?: Duration | null | undefined;
                    lifespan?: Duration | null | undefined;
                } & {}>;
                enabled: boolean;
                showInSelector: boolean;
            }>> | undefined;
            pki?: Record<string, Readonly<{
                description?: string | undefined;
                origin?: string | string[] | undefined;
                icon?: string | undefined;
                hint?: string | undefined;
                accessAgreement?: Readonly<{} & {
                    message: string;
                }> | undefined;
            } & {
                order: number;
                session: {
                    idleTimeout?: Duration | null;
                    lifespan?: Duration | null;
                } | Readonly<{
                    idleTimeout?: Duration | null | undefined;
                    lifespan?: Duration | null | undefined;
                } & {}>;
                enabled: boolean;
                showInSelector: boolean;
            }>> | undefined;
            saml?: Record<string, Readonly<{
                description?: string | undefined;
                origin?: string | string[] | undefined;
                icon?: string | undefined;
                hint?: string | undefined;
                accessAgreement?: Readonly<{} & {
                    message: string;
                }> | undefined;
                maxRedirectURLSize?: import("@kbn/config-schema").ByteSizeValue | undefined;
            } & {
                realm: string;
                order: number;
                session: {
                    idleTimeout?: Duration | null;
                    lifespan?: Duration | null;
                } | Readonly<{
                    idleTimeout?: Duration | null | undefined;
                    lifespan?: Duration | null | undefined;
                } & {}>;
                enabled: boolean;
                showInSelector: boolean;
                useRelayStateDeepLink: boolean;
            }>> | undefined;
            oidc?: Record<string, Readonly<{
                description?: string | undefined;
                origin?: string | string[] | undefined;
                icon?: string | undefined;
                hint?: string | undefined;
                accessAgreement?: Readonly<{} & {
                    message: string;
                }> | undefined;
            } & {
                realm: string;
                order: number;
                session: {
                    idleTimeout?: Duration | null;
                    lifespan?: Duration | null;
                } | Readonly<{
                    idleTimeout?: Duration | null | undefined;
                    lifespan?: Duration | null | undefined;
                } & {}>;
                enabled: boolean;
                showInSelector: boolean;
            }>> | undefined;
        } & {}>;
        sortedProviders: readonly {
            type: keyof ProvidersConfigType;
            name: string;
            order: number;
            hasAccessAgreement: boolean;
        }[];
        http: Readonly<{} & {
            enabled: boolean;
            autoSchemesEnabled: boolean;
            schemes: string[];
            jwt: Readonly<{} & {
                taggedRoutesOnly: boolean;
            }>;
        }>;
    };
    session: {
        concurrentSessions: Readonly<{} & {
            maxSessions: number;
        }> | undefined;
        cleanupInterval: Duration;
        getExpirationTimeouts(provider: AuthenticationProvider | undefined): {
            idleTimeout: Duration | null;
            lifespan: Duration | null;
        };
    };
    encryptionKey: string;
    secureCookies: boolean;
    accessAgreement?: Readonly<{} & {
        message: string;
    }> | undefined;
    loginHelp?: string | undefined;
    sameSiteCookies?: "None" | "Strict" | "Lax" | undefined;
    mcp?: Readonly<{} & {
        oauth2: Readonly<{} & {
            metadata: Readonly<{
                bearer_methods_supported?: ("query" | "body" | "header")[] | undefined;
                scopes_supported?: string[] | undefined;
                resource_documentation?: string | undefined;
            } & {
                resource: string;
                authorization_servers: string[];
            }>;
        }>;
    }> | undefined;
    public: Readonly<{
        port?: number | undefined;
        hostname?: string | undefined;
        protocol?: "http" | "https" | undefined;
    } & {}>;
    ui: Readonly<{} & {
        userManagementEnabled: boolean;
        roleMappingManagementEnabled: boolean;
    }>;
    uiam: Readonly<{
        url?: string | undefined;
        sharedSecret?: string | undefined;
    } & {
        enabled: boolean;
        ssl: Readonly<{
            key?: string | undefined;
            certificate?: string | undefined;
            certificateAuthorities?: string | string[] | undefined;
        } & {
            verificationMode: "none" | "full" | "certificate";
        }>;
    }>;
    loginAssistanceMessage: string;
    showInsecureClusterWarning: boolean;
    roleManagementEnabled: boolean;
    showNavLinks: boolean;
    cookieName: string;
    fipsMode: Readonly<{} & {
        enabled: boolean;
    }>;
};
export {};
