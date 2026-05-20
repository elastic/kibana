import * as rt from 'io-ts';
import type { SavedObject } from '@kbn/core/server';
import type { CaseConnector, CaseCustomFields, CaseSeverity, ConfigurationAttributes } from '../../../common/types/domain';
import type { ConnectorPersisted } from './connectors';
import type { User, UserProfile } from './user';
export interface ConfigurationPersistedAttributes {
    connector: ConnectorPersisted;
    closure_type: string;
    owner: string;
    created_at: string;
    created_by: User;
    updated_at: string | null;
    updated_by: User | null;
    customFields?: PersistedCustomFieldsConfiguration;
    templates?: PersistedTemplatesConfiguration;
    observableTypes?: PersistedObservableTypesConfiguration;
}
type PersistedObservableTypesConfiguration = Array<{
    key: string;
    label: string;
}>;
type PersistedCustomFieldsConfiguration = Array<{
    key: string;
    type: string;
    label: string;
    required: boolean;
    defaultValue?: string | number | boolean | null;
}>;
type PersistedTemplatesConfiguration = Array<{
    key: string;
    name: string;
    description?: string;
    tags?: string[];
    caseFields?: CaseFieldsAttributes | null;
}>;
export interface CaseFieldsAttributes {
    title?: string;
    assignees?: UserProfile[];
    connector?: CaseConnector;
    description?: string;
    severity?: CaseSeverity;
    tags?: string[];
    category?: string | null;
    customFields?: CaseCustomFields;
    settings?: {
        syncAlerts: boolean;
        extractObservables?: boolean;
    };
}
export type ConfigurationTransformedAttributes = ConfigurationAttributes;
export type ConfigurationSavedObjectTransformed = SavedObject<ConfigurationTransformedAttributes>;
export declare const ConfigurationPartialAttributesRt: rt.IntersectionC<[rt.ExactC<rt.PartialC<{
    connector: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        id: rt.StringC;
    }>>, rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../../../common/types/domain").ConnectorTypes.casesWebhook>;
        fields: rt.NullC;
    }>>, rt.ExactC<rt.TypeC<{
        name: rt.StringC;
    }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../../../common/types/domain").ConnectorTypes.jira>;
        fields: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            issueType: rt.UnionC<[rt.StringC, rt.NullC]>;
            priority: rt.UnionC<[rt.StringC, rt.NullC]>;
            parent: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>>, rt.ExactC<rt.PartialC<{
            otherFields: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>>]>, rt.NullC]>;
    }>>, rt.ExactC<rt.TypeC<{
        name: rt.StringC;
    }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../../../common/types/domain").ConnectorTypes.none>;
        fields: rt.NullC;
    }>>, rt.ExactC<rt.TypeC<{
        name: rt.StringC;
    }>>]>, rt.IntersectionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../../../common/types/domain").ConnectorTypes.resilient>;
        fields: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            incidentTypes: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.NullC]>;
            severityCode: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>>, rt.ExactC<rt.PartialC<{
            additionalFields: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>>]>, rt.NullC]>;
    }>>, rt.ExactC<rt.PartialC<{
        additionalFields: rt.UnionC<[rt.StringC, rt.NullC]>;
    }>>]>, rt.ExactC<rt.TypeC<{
        name: rt.StringC;
    }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../../../common/types/domain").ConnectorTypes.serviceNowITSM>;
        fields: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            impact: rt.UnionC<[rt.StringC, rt.NullC]>;
            severity: rt.UnionC<[rt.StringC, rt.NullC]>;
            urgency: rt.UnionC<[rt.StringC, rt.NullC]>;
            category: rt.UnionC<[rt.StringC, rt.NullC]>;
            subcategory: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>>, rt.ExactC<rt.PartialC<{
            additionalFields: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>>]>, rt.NullC]>;
    }>>, rt.ExactC<rt.TypeC<{
        name: rt.StringC;
    }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../../../common/types/domain").ConnectorTypes.serviceNowSIR>;
        fields: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            category: rt.UnionC<[rt.StringC, rt.NullC]>;
            destIp: rt.UnionC<[rt.BooleanC, rt.NullC]>;
            malwareHash: rt.UnionC<[rt.BooleanC, rt.NullC]>;
            malwareUrl: rt.UnionC<[rt.BooleanC, rt.NullC]>;
            priority: rt.UnionC<[rt.StringC, rt.NullC]>;
            sourceIp: rt.UnionC<[rt.BooleanC, rt.NullC]>;
            subcategory: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>>, rt.ExactC<rt.PartialC<{
            additionalFields: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>>]>, rt.NullC]>;
    }>>, rt.ExactC<rt.TypeC<{
        name: rt.StringC;
    }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../../../common/types/domain").ConnectorTypes.swimlane>;
        fields: rt.UnionC<[rt.ExactC<rt.TypeC<{
            caseId: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>>, rt.NullC]>;
    }>>, rt.ExactC<rt.TypeC<{
        name: rt.StringC;
    }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../../../common/types/domain").ConnectorTypes.theHive>;
        fields: rt.UnionC<[rt.ExactC<rt.TypeC<{
            tlp: rt.UnionC<[rt.NumberC, rt.NullC]>;
        }>>, rt.NullC]>;
    }>>, rt.ExactC<rt.TypeC<{
        name: rt.StringC;
    }>>]>]>]>;
    closure_type: rt.UnionC<[rt.LiteralC<"close-by-user">, rt.LiteralC<"close-by-pushing">]>;
    customFields: rt.ArrayC<rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../../../common/types/domain").CustomFieldTypes.TEXT>;
    }>>, rt.ExactC<rt.TypeC<{
        key: rt.StringC;
        label: rt.StringC;
        required: rt.BooleanC;
    }>>, rt.ExactC<rt.PartialC<{
        defaultValue: rt.UnionC<[rt.StringC, rt.NullC]>;
    }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../../../common/types/domain").CustomFieldTypes.TOGGLE>;
    }>>, rt.ExactC<rt.TypeC<{
        key: rt.StringC;
        label: rt.StringC;
        required: rt.BooleanC;
    }>>, rt.ExactC<rt.PartialC<{
        defaultValue: rt.UnionC<[rt.BooleanC, rt.NullC]>;
    }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../../../common/types/domain").CustomFieldTypes.NUMBER>;
    }>>, rt.ExactC<rt.TypeC<{
        key: rt.StringC;
        label: rt.StringC;
        required: rt.BooleanC;
    }>>, rt.ExactC<rt.PartialC<{
        defaultValue: rt.UnionC<[rt.NumberC, rt.NullC]>;
    }>>]>]>>;
    templates: rt.ArrayC<rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        key: rt.StringC;
        name: rt.StringC;
        caseFields: rt.UnionC<[rt.NullC, rt.ExactC<rt.PartialC<{
            description: rt.StringC;
            tags: rt.ArrayC<rt.StringC>;
            title: rt.StringC;
            connector: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                id: rt.StringC;
            }>>, rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                type: rt.LiteralC<import("../../../common/types/domain").ConnectorTypes.casesWebhook>;
                fields: rt.NullC;
            }>>, rt.ExactC<rt.TypeC<{
                name: rt.StringC;
            }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                type: rt.LiteralC<import("../../../common/types/domain").ConnectorTypes.jira>;
                fields: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                    issueType: rt.UnionC<[rt.StringC, rt.NullC]>;
                    priority: rt.UnionC<[rt.StringC, rt.NullC]>;
                    parent: rt.UnionC<[rt.StringC, rt.NullC]>;
                }>>, rt.ExactC<rt.PartialC<{
                    otherFields: rt.UnionC<[rt.StringC, rt.NullC]>;
                }>>]>, rt.NullC]>;
            }>>, rt.ExactC<rt.TypeC<{
                name: rt.StringC;
            }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                type: rt.LiteralC<import("../../../common/types/domain").ConnectorTypes.none>;
                fields: rt.NullC;
            }>>, rt.ExactC<rt.TypeC<{
                name: rt.StringC;
            }>>]>, rt.IntersectionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                type: rt.LiteralC<import("../../../common/types/domain").ConnectorTypes.resilient>;
                fields: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                    incidentTypes: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.NullC]>;
                    severityCode: rt.UnionC<[rt.StringC, rt.NullC]>;
                }>>, rt.ExactC<rt.PartialC<{
                    additionalFields: rt.UnionC<[rt.StringC, rt.NullC]>;
                }>>]>, rt.NullC]>;
            }>>, rt.ExactC<rt.PartialC<{
                additionalFields: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>]>, rt.ExactC<rt.TypeC<{
                name: rt.StringC;
            }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                type: rt.LiteralC<import("../../../common/types/domain").ConnectorTypes.serviceNowITSM>;
                fields: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                    impact: rt.UnionC<[rt.StringC, rt.NullC]>;
                    severity: rt.UnionC<[rt.StringC, rt.NullC]>;
                    urgency: rt.UnionC<[rt.StringC, rt.NullC]>;
                    category: rt.UnionC<[rt.StringC, rt.NullC]>;
                    subcategory: rt.UnionC<[rt.StringC, rt.NullC]>;
                }>>, rt.ExactC<rt.PartialC<{
                    additionalFields: rt.UnionC<[rt.StringC, rt.NullC]>;
                }>>]>, rt.NullC]>;
            }>>, rt.ExactC<rt.TypeC<{
                name: rt.StringC;
            }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                type: rt.LiteralC<import("../../../common/types/domain").ConnectorTypes.serviceNowSIR>;
                fields: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                    category: rt.UnionC<[rt.StringC, rt.NullC]>;
                    destIp: rt.UnionC<[rt.BooleanC, rt.NullC]>;
                    malwareHash: rt.UnionC<[rt.BooleanC, rt.NullC]>;
                    malwareUrl: rt.UnionC<[rt.BooleanC, rt.NullC]>;
                    priority: rt.UnionC<[rt.StringC, rt.NullC]>;
                    sourceIp: rt.UnionC<[rt.BooleanC, rt.NullC]>;
                    subcategory: rt.UnionC<[rt.StringC, rt.NullC]>;
                }>>, rt.ExactC<rt.PartialC<{
                    additionalFields: rt.UnionC<[rt.StringC, rt.NullC]>;
                }>>]>, rt.NullC]>;
            }>>, rt.ExactC<rt.TypeC<{
                name: rt.StringC;
            }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                type: rt.LiteralC<import("../../../common/types/domain").ConnectorTypes.swimlane>;
                fields: rt.UnionC<[rt.ExactC<rt.TypeC<{
                    caseId: rt.UnionC<[rt.StringC, rt.NullC]>;
                }>>, rt.NullC]>;
            }>>, rt.ExactC<rt.TypeC<{
                name: rt.StringC;
            }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                type: rt.LiteralC<import("../../../common/types/domain").ConnectorTypes.theHive>;
                fields: rt.UnionC<[rt.ExactC<rt.TypeC<{
                    tlp: rt.UnionC<[rt.NumberC, rt.NullC]>;
                }>>, rt.NullC]>;
            }>>, rt.ExactC<rt.TypeC<{
                name: rt.StringC;
            }>>]>]>]>;
            severity: rt.UnionC<[rt.LiteralC<CaseSeverity.LOW>, rt.LiteralC<CaseSeverity.MEDIUM>, rt.LiteralC<CaseSeverity.HIGH>, rt.LiteralC<CaseSeverity.CRITICAL>]>;
            assignees: rt.ArrayC<rt.ExactC<rt.TypeC<{
                uid: rt.StringC;
            }>>>;
            category: rt.UnionC<[rt.StringC, rt.NullC]>;
            customFields: rt.ArrayC<rt.UnionC<[rt.ExactC<rt.TypeC<{
                key: rt.StringC;
                type: rt.LiteralC<import("../../../common/types/domain").CustomFieldTypes.TEXT>;
                value: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>, rt.ExactC<rt.TypeC<{
                key: rt.StringC;
                type: rt.LiteralC<import("../../../common/types/domain").CustomFieldTypes.TOGGLE>;
                value: rt.UnionC<[rt.BooleanC, rt.NullC]>;
            }>>, rt.ExactC<rt.TypeC<{
                key: rt.StringC;
                type: rt.LiteralC<import("../../../common/types/domain").CustomFieldTypes.NUMBER>;
                value: rt.UnionC<[rt.NumberC, rt.NullC]>;
            }>>]>>;
            settings: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                syncAlerts: rt.BooleanC;
            }>>, rt.ExactC<rt.PartialC<{
                extractObservables: rt.BooleanC;
            }>>]>;
            observables: rt.ArrayC<rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                id: rt.StringC;
                createdAt: rt.StringC;
                updatedAt: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>, rt.ExactC<rt.TypeC<{
                typeKey: rt.StringC;
                value: rt.StringC;
                description: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>]>>;
        }>>]>;
    }>>, rt.ExactC<rt.PartialC<{
        description: rt.StringC;
        tags: rt.ArrayC<rt.StringC>;
    }>>]>>;
    observableTypes: rt.ArrayC<rt.ExactC<rt.TypeC<{
        key: rt.StringC;
        label: rt.StringC;
    }>>>;
}>>, rt.ExactC<rt.PartialC<{
    created_at: rt.StringC;
    created_by: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
    }>>, rt.ExactC<rt.PartialC<{
        profile_uid: rt.StringC;
    }>>]>;
    updated_at: rt.UnionC<[rt.StringC, rt.NullC]>;
    updated_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
    }>>, rt.ExactC<rt.PartialC<{
        profile_uid: rt.StringC;
    }>>]>, rt.NullC]>;
}>>, rt.ExactC<rt.PartialC<{
    owner: rt.StringC;
}>>]>;
export declare const ConfigurationTransformedAttributesRt: rt.IntersectionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
    connector: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        id: rt.StringC;
    }>>, rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../../../common/types/domain").ConnectorTypes.casesWebhook>;
        fields: rt.NullC;
    }>>, rt.ExactC<rt.TypeC<{
        name: rt.StringC;
    }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../../../common/types/domain").ConnectorTypes.jira>;
        fields: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            issueType: rt.UnionC<[rt.StringC, rt.NullC]>;
            priority: rt.UnionC<[rt.StringC, rt.NullC]>;
            parent: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>>, rt.ExactC<rt.PartialC<{
            otherFields: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>>]>, rt.NullC]>;
    }>>, rt.ExactC<rt.TypeC<{
        name: rt.StringC;
    }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../../../common/types/domain").ConnectorTypes.none>;
        fields: rt.NullC;
    }>>, rt.ExactC<rt.TypeC<{
        name: rt.StringC;
    }>>]>, rt.IntersectionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../../../common/types/domain").ConnectorTypes.resilient>;
        fields: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            incidentTypes: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.NullC]>;
            severityCode: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>>, rt.ExactC<rt.PartialC<{
            additionalFields: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>>]>, rt.NullC]>;
    }>>, rt.ExactC<rt.PartialC<{
        additionalFields: rt.UnionC<[rt.StringC, rt.NullC]>;
    }>>]>, rt.ExactC<rt.TypeC<{
        name: rt.StringC;
    }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../../../common/types/domain").ConnectorTypes.serviceNowITSM>;
        fields: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            impact: rt.UnionC<[rt.StringC, rt.NullC]>;
            severity: rt.UnionC<[rt.StringC, rt.NullC]>;
            urgency: rt.UnionC<[rt.StringC, rt.NullC]>;
            category: rt.UnionC<[rt.StringC, rt.NullC]>;
            subcategory: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>>, rt.ExactC<rt.PartialC<{
            additionalFields: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>>]>, rt.NullC]>;
    }>>, rt.ExactC<rt.TypeC<{
        name: rt.StringC;
    }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../../../common/types/domain").ConnectorTypes.serviceNowSIR>;
        fields: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
            category: rt.UnionC<[rt.StringC, rt.NullC]>;
            destIp: rt.UnionC<[rt.BooleanC, rt.NullC]>;
            malwareHash: rt.UnionC<[rt.BooleanC, rt.NullC]>;
            malwareUrl: rt.UnionC<[rt.BooleanC, rt.NullC]>;
            priority: rt.UnionC<[rt.StringC, rt.NullC]>;
            sourceIp: rt.UnionC<[rt.BooleanC, rt.NullC]>;
            subcategory: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>>, rt.ExactC<rt.PartialC<{
            additionalFields: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>>]>, rt.NullC]>;
    }>>, rt.ExactC<rt.TypeC<{
        name: rt.StringC;
    }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../../../common/types/domain").ConnectorTypes.swimlane>;
        fields: rt.UnionC<[rt.ExactC<rt.TypeC<{
            caseId: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>>, rt.NullC]>;
    }>>, rt.ExactC<rt.TypeC<{
        name: rt.StringC;
    }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../../../common/types/domain").ConnectorTypes.theHive>;
        fields: rt.UnionC<[rt.ExactC<rt.TypeC<{
            tlp: rt.UnionC<[rt.NumberC, rt.NullC]>;
        }>>, rt.NullC]>;
    }>>, rt.ExactC<rt.TypeC<{
        name: rt.StringC;
    }>>]>]>]>;
    closure_type: rt.UnionC<[rt.LiteralC<"close-by-user">, rt.LiteralC<"close-by-pushing">]>;
    customFields: rt.ArrayC<rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../../../common/types/domain").CustomFieldTypes.TEXT>;
    }>>, rt.ExactC<rt.TypeC<{
        key: rt.StringC;
        label: rt.StringC;
        required: rt.BooleanC;
    }>>, rt.ExactC<rt.PartialC<{
        defaultValue: rt.UnionC<[rt.StringC, rt.NullC]>;
    }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../../../common/types/domain").CustomFieldTypes.TOGGLE>;
    }>>, rt.ExactC<rt.TypeC<{
        key: rt.StringC;
        label: rt.StringC;
        required: rt.BooleanC;
    }>>, rt.ExactC<rt.PartialC<{
        defaultValue: rt.UnionC<[rt.BooleanC, rt.NullC]>;
    }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        type: rt.LiteralC<import("../../../common/types/domain").CustomFieldTypes.NUMBER>;
    }>>, rt.ExactC<rt.TypeC<{
        key: rt.StringC;
        label: rt.StringC;
        required: rt.BooleanC;
    }>>, rt.ExactC<rt.PartialC<{
        defaultValue: rt.UnionC<[rt.NumberC, rt.NullC]>;
    }>>]>]>>;
    templates: rt.ArrayC<rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        key: rt.StringC;
        name: rt.StringC;
        caseFields: rt.UnionC<[rt.NullC, rt.ExactC<rt.PartialC<{
            description: rt.StringC;
            tags: rt.ArrayC<rt.StringC>;
            title: rt.StringC;
            connector: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                id: rt.StringC;
            }>>, rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                type: rt.LiteralC<import("../../../common/types/domain").ConnectorTypes.casesWebhook>;
                fields: rt.NullC;
            }>>, rt.ExactC<rt.TypeC<{
                name: rt.StringC;
            }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                type: rt.LiteralC<import("../../../common/types/domain").ConnectorTypes.jira>;
                fields: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                    issueType: rt.UnionC<[rt.StringC, rt.NullC]>;
                    priority: rt.UnionC<[rt.StringC, rt.NullC]>;
                    parent: rt.UnionC<[rt.StringC, rt.NullC]>;
                }>>, rt.ExactC<rt.PartialC<{
                    otherFields: rt.UnionC<[rt.StringC, rt.NullC]>;
                }>>]>, rt.NullC]>;
            }>>, rt.ExactC<rt.TypeC<{
                name: rt.StringC;
            }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                type: rt.LiteralC<import("../../../common/types/domain").ConnectorTypes.none>;
                fields: rt.NullC;
            }>>, rt.ExactC<rt.TypeC<{
                name: rt.StringC;
            }>>]>, rt.IntersectionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                type: rt.LiteralC<import("../../../common/types/domain").ConnectorTypes.resilient>;
                fields: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                    incidentTypes: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.NullC]>;
                    severityCode: rt.UnionC<[rt.StringC, rt.NullC]>;
                }>>, rt.ExactC<rt.PartialC<{
                    additionalFields: rt.UnionC<[rt.StringC, rt.NullC]>;
                }>>]>, rt.NullC]>;
            }>>, rt.ExactC<rt.PartialC<{
                additionalFields: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>]>, rt.ExactC<rt.TypeC<{
                name: rt.StringC;
            }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                type: rt.LiteralC<import("../../../common/types/domain").ConnectorTypes.serviceNowITSM>;
                fields: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                    impact: rt.UnionC<[rt.StringC, rt.NullC]>;
                    severity: rt.UnionC<[rt.StringC, rt.NullC]>;
                    urgency: rt.UnionC<[rt.StringC, rt.NullC]>;
                    category: rt.UnionC<[rt.StringC, rt.NullC]>;
                    subcategory: rt.UnionC<[rt.StringC, rt.NullC]>;
                }>>, rt.ExactC<rt.PartialC<{
                    additionalFields: rt.UnionC<[rt.StringC, rt.NullC]>;
                }>>]>, rt.NullC]>;
            }>>, rt.ExactC<rt.TypeC<{
                name: rt.StringC;
            }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                type: rt.LiteralC<import("../../../common/types/domain").ConnectorTypes.serviceNowSIR>;
                fields: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                    category: rt.UnionC<[rt.StringC, rt.NullC]>;
                    destIp: rt.UnionC<[rt.BooleanC, rt.NullC]>;
                    malwareHash: rt.UnionC<[rt.BooleanC, rt.NullC]>;
                    malwareUrl: rt.UnionC<[rt.BooleanC, rt.NullC]>;
                    priority: rt.UnionC<[rt.StringC, rt.NullC]>;
                    sourceIp: rt.UnionC<[rt.BooleanC, rt.NullC]>;
                    subcategory: rt.UnionC<[rt.StringC, rt.NullC]>;
                }>>, rt.ExactC<rt.PartialC<{
                    additionalFields: rt.UnionC<[rt.StringC, rt.NullC]>;
                }>>]>, rt.NullC]>;
            }>>, rt.ExactC<rt.TypeC<{
                name: rt.StringC;
            }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                type: rt.LiteralC<import("../../../common/types/domain").ConnectorTypes.swimlane>;
                fields: rt.UnionC<[rt.ExactC<rt.TypeC<{
                    caseId: rt.UnionC<[rt.StringC, rt.NullC]>;
                }>>, rt.NullC]>;
            }>>, rt.ExactC<rt.TypeC<{
                name: rt.StringC;
            }>>]>, rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                type: rt.LiteralC<import("../../../common/types/domain").ConnectorTypes.theHive>;
                fields: rt.UnionC<[rt.ExactC<rt.TypeC<{
                    tlp: rt.UnionC<[rt.NumberC, rt.NullC]>;
                }>>, rt.NullC]>;
            }>>, rt.ExactC<rt.TypeC<{
                name: rt.StringC;
            }>>]>]>]>;
            severity: rt.UnionC<[rt.LiteralC<CaseSeverity.LOW>, rt.LiteralC<CaseSeverity.MEDIUM>, rt.LiteralC<CaseSeverity.HIGH>, rt.LiteralC<CaseSeverity.CRITICAL>]>;
            assignees: rt.ArrayC<rt.ExactC<rt.TypeC<{
                uid: rt.StringC;
            }>>>;
            category: rt.UnionC<[rt.StringC, rt.NullC]>;
            customFields: rt.ArrayC<rt.UnionC<[rt.ExactC<rt.TypeC<{
                key: rt.StringC;
                type: rt.LiteralC<import("../../../common/types/domain").CustomFieldTypes.TEXT>;
                value: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>, rt.ExactC<rt.TypeC<{
                key: rt.StringC;
                type: rt.LiteralC<import("../../../common/types/domain").CustomFieldTypes.TOGGLE>;
                value: rt.UnionC<[rt.BooleanC, rt.NullC]>;
            }>>, rt.ExactC<rt.TypeC<{
                key: rt.StringC;
                type: rt.LiteralC<import("../../../common/types/domain").CustomFieldTypes.NUMBER>;
                value: rt.UnionC<[rt.NumberC, rt.NullC]>;
            }>>]>>;
            settings: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                syncAlerts: rt.BooleanC;
            }>>, rt.ExactC<rt.PartialC<{
                extractObservables: rt.BooleanC;
            }>>]>;
            observables: rt.ArrayC<rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                id: rt.StringC;
                createdAt: rt.StringC;
                updatedAt: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>, rt.ExactC<rt.TypeC<{
                typeKey: rt.StringC;
                value: rt.StringC;
                description: rt.UnionC<[rt.StringC, rt.NullC]>;
            }>>]>>;
        }>>]>;
    }>>, rt.ExactC<rt.PartialC<{
        description: rt.StringC;
        tags: rt.ArrayC<rt.StringC>;
    }>>]>>;
    observableTypes: rt.ArrayC<rt.ExactC<rt.TypeC<{
        key: rt.StringC;
        label: rt.StringC;
    }>>>;
}>>, rt.ExactC<rt.TypeC<{
    owner: rt.StringC;
}>>]>, rt.ExactC<rt.TypeC<{
    created_at: rt.StringC;
    created_by: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
    }>>, rt.ExactC<rt.PartialC<{
        profile_uid: rt.StringC;
    }>>]>;
    updated_at: rt.UnionC<[rt.StringC, rt.NullC]>;
    updated_by: rt.UnionC<[rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        email: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        full_name: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
        username: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.StringC]>;
    }>>, rt.ExactC<rt.PartialC<{
        profile_uid: rt.StringC;
    }>>]>, rt.NullC]>;
}>>]>;
export {};
