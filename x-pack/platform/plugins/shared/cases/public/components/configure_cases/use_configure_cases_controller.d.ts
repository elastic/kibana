import React from 'react';
import type { ClosureType } from '../../containers/configure/types';
export interface ConfigureCasesFlyout<ExtraFlyoutType extends string = never> {
    type: 'addConnector' | 'editConnector' | 'observableTypes' | ExtraFlyoutType;
    visible: boolean;
}
/**
 * Shared state and handlers for the connector, closure-type, and observable-types
 * sections of the case settings page. Consumed by both the legacy `ConfigureCases`
 * page and the `ConfigureCasesRedesign` page so a bug fix to this logic only needs to
 * be made once while both pages coexist behind the `casesRedesign.settings` feature
 * flag. Callers that need additional flyout types of their own (e.g. the legacy page's
 * custom fields and templates flyouts) can pass those as the `ExtraFlyoutType` generic
 * so `setFlyOutVisibility` stays the single source of truth for "which flyout is open".
 */
export declare const useConfigureCasesController: <ExtraFlyoutType extends string = never>() => {
    hasMinimumLicensePermissions: boolean;
    hasMinimumLicensePermissionsForObservables: boolean;
    isObservablesFeatureEnabled: boolean;
    configurationId: string;
    configurationVersion: string;
    closureType: "close-by-user" | "close-by-pushing";
    connector: {
        id: string;
        type: import("../../../common").ConnectorTypes.casesWebhook;
        fields: null;
        name: string;
    } | {
        id: string;
        type: import("../../../common").ConnectorTypes.jira;
        fields: {
            issueType: string | null;
            priority: string | null;
            parent: string | null;
            otherFields?: string | null | undefined;
        } | null;
        name: string;
    } | {
        id: string;
        type: import("../../../common").ConnectorTypes.none;
        fields: null;
        name: string;
    } | {
        id: string;
        type: import("../../../common").ConnectorTypes.resilient;
        fields: {
            incidentTypes: string[] | null;
            severityCode: string | null;
            additionalFields?: string | null | undefined;
        } | null;
        additionalFields?: string | null | undefined;
        name: string;
    } | {
        id: string;
        type: import("../../../common").ConnectorTypes.serviceNowITSM;
        fields: {
            impact: string | null;
            severity: string | null;
            urgency: string | null;
            category: string | null;
            subcategory: string | null;
            additionalFields?: string | null | undefined;
        } | null;
        name: string;
    } | {
        id: string;
        type: import("../../../common").ConnectorTypes.serviceNowSIR;
        fields: {
            category: string | null;
            destIp: boolean | null;
            malwareHash: boolean | null;
            malwareUrl: boolean | null;
            priority: string | null;
            sourceIp: boolean | null;
            subcategory: string | null;
            additionalFields?: string | null | undefined;
        } | null;
        name: string;
    } | {
        id: string;
        type: import("../../../common").ConnectorTypes.swimlane;
        fields: {
            caseId: string | null;
        } | null;
        name: string;
    } | {
        id: string;
        type: import("../../../common").ConnectorTypes.theHive;
        fields: {
            tlp: number | null;
        } | null;
        name: string;
    };
    mappings: {
        actionType: "overwrite" | "append" | "nothing";
        source: "description" | "title" | "tags" | "comments";
        target: string;
    }[];
    customFields: ({
        type: import("../../../common/types/domain").CustomFieldTypes.TEXT;
        key: string;
        label: string;
        required: boolean;
        defaultValue?: string | null | undefined;
    } | {
        type: import("../../../common/types/domain").CustomFieldTypes.TOGGLE;
        key: string;
        label: string;
        required: boolean;
        defaultValue?: boolean | null | undefined;
    } | {
        type: import("../../../common/types/domain").CustomFieldTypes.NUMBER;
        key: string;
        label: string;
        required: boolean;
        defaultValue?: number | null | undefined;
    })[];
    templates: {
        key: string;
        name: string;
        caseFields: {
            description?: string | undefined;
            tags?: string[] | undefined;
            title?: string | undefined;
            connector?: {
                id: string;
                type: import("../../../common").ConnectorTypes.casesWebhook;
                fields: null;
                name: string;
            } | {
                id: string;
                type: import("../../../common").ConnectorTypes.jira;
                fields: {
                    issueType: string | null;
                    priority: string | null;
                    parent: string | null;
                    otherFields?: string | null | undefined;
                } | null;
                name: string;
            } | {
                id: string;
                type: import("../../../common").ConnectorTypes.none;
                fields: null;
                name: string;
            } | {
                id: string;
                type: import("../../../common").ConnectorTypes.resilient;
                fields: {
                    incidentTypes: string[] | null;
                    severityCode: string | null;
                    additionalFields?: string | null | undefined;
                } | null;
                additionalFields?: string | null | undefined;
                name: string;
            } | {
                id: string;
                type: import("../../../common").ConnectorTypes.serviceNowITSM;
                fields: {
                    impact: string | null;
                    severity: string | null;
                    urgency: string | null;
                    category: string | null;
                    subcategory: string | null;
                    additionalFields?: string | null | undefined;
                } | null;
                name: string;
            } | {
                id: string;
                type: import("../../../common").ConnectorTypes.serviceNowSIR;
                fields: {
                    category: string | null;
                    destIp: boolean | null;
                    malwareHash: boolean | null;
                    malwareUrl: boolean | null;
                    priority: string | null;
                    sourceIp: boolean | null;
                    subcategory: string | null;
                    additionalFields?: string | null | undefined;
                } | null;
                name: string;
            } | {
                id: string;
                type: import("../../../common").ConnectorTypes.swimlane;
                fields: {
                    caseId: string | null;
                } | null;
                name: string;
            } | {
                id: string;
                type: import("../../../common").ConnectorTypes.theHive;
                fields: {
                    tlp: number | null;
                } | null;
                name: string;
            } | undefined;
            severity?: import("../../../common").CaseSeverity | undefined;
            assignees?: {
                uid: string;
                username?: string | null | undefined;
                fullName?: string | null | undefined;
                email?: string | null | undefined;
            }[] | undefined;
            category?: string | null | undefined;
            customFields?: ({
                key: string;
                type: import("../../../common/types/domain").CustomFieldTypes.TEXT;
                value: string | null;
            } | {
                key: string;
                type: import("../../../common/types/domain").CustomFieldTypes.TOGGLE;
                value: boolean | null;
            } | {
                key: string;
                type: import("../../../common/types/domain").CustomFieldTypes.NUMBER;
                value: number | null;
            })[] | undefined;
            settings?: {
                syncAlerts: boolean;
                extractObservables?: boolean | undefined;
            } | undefined;
            observables?: {
                id: string;
                createdAt: string;
                updatedAt: string | null;
                typeKey: string;
                value: string;
                description: string | null;
            }[] | undefined;
        } | null;
        description?: string | undefined;
        tags?: string[] | undefined;
    }[];
    observableTypes: {
        key: string;
        label: string;
    }[];
    isPersistingConfiguration: boolean;
    isLoadingCaseConfiguration: boolean;
    isLoadingConnectors: boolean;
    connectors: import("@kbn/actions-plugin/server").Connector[];
    actionTypes: import("@kbn/actions-plugin/common").ActionType[];
    isLoadingAny: boolean;
    connectorIsValid: boolean;
    updateConnectorDisabled: boolean;
    flyOutVisibility: ConfigureCasesFlyout<ExtraFlyoutType> | null;
    setFlyOutVisibility: React.Dispatch<React.SetStateAction<ConfigureCasesFlyout<ExtraFlyoutType> | null>>;
    persistCaseConfigure: import("@tanstack/react-query").UseMutateFunction<import("../../containers/types").CasesConfigurationUI, import("../../types").ServerError, Omit<{
        connector: {
            id: string;
            type: import("../../../common").ConnectorTypes.casesWebhook;
            fields: null;
            name: string;
        } | {
            id: string;
            type: import("../../../common").ConnectorTypes.jira;
            fields: {
                issueType: string | null;
                priority: string | null;
                parent: string | null;
                otherFields?: string | null | undefined;
            } | null;
            name: string;
        } | {
            id: string;
            type: import("../../../common").ConnectorTypes.none;
            fields: null;
            name: string;
        } | {
            id: string;
            type: import("../../../common").ConnectorTypes.resilient;
            fields: {
                incidentTypes: string[] | null;
                severityCode: string | null;
                additionalFields?: string | null | undefined;
            } | null;
            additionalFields?: string | null | undefined;
            name: string;
        } | {
            id: string;
            type: import("../../../common").ConnectorTypes.serviceNowITSM;
            fields: {
                impact: string | null;
                severity: string | null;
                urgency: string | null;
                category: string | null;
                subcategory: string | null;
                additionalFields?: string | null | undefined;
            } | null;
            name: string;
        } | {
            id: string;
            type: import("../../../common").ConnectorTypes.serviceNowSIR;
            fields: {
                category: string | null;
                destIp: boolean | null;
                malwareHash: boolean | null;
                malwareUrl: boolean | null;
                priority: string | null;
                sourceIp: boolean | null;
                subcategory: string | null;
                additionalFields?: string | null | undefined;
            } | null;
            name: string;
        } | {
            id: string;
            type: import("../../../common").ConnectorTypes.swimlane;
            fields: {
                caseId: string | null;
            } | null;
            name: string;
        } | {
            id: string;
            type: import("../../../common").ConnectorTypes.theHive;
            fields: {
                tlp: number | null;
            } | null;
            name: string;
        };
        closureType: "close-by-user" | "close-by-pushing";
        owner: string;
        customFields?: ({
            type: import("../../../common/types/domain").CustomFieldTypes.TEXT;
            key: string;
            label: string;
            required: boolean;
            defaultValue?: string | null | undefined;
        } | {
            type: import("../../../common/types/domain").CustomFieldTypes.TOGGLE;
            key: string;
            label: string;
            required: boolean;
            defaultValue?: boolean | null | undefined;
        } | {
            type: import("../../../common/types/domain").CustomFieldTypes.NUMBER;
            key: string;
            label: string;
            required: boolean;
            defaultValue?: number | null | undefined;
        })[] | undefined;
        templates?: {
            key: string;
            name: string;
            caseFields: {
                description?: string | undefined;
                tags?: string[] | undefined;
                title?: string | undefined;
                connector?: {
                    id: string;
                    type: import("../../../common").ConnectorTypes.casesWebhook;
                    fields: null;
                    name: string;
                } | {
                    id: string;
                    type: import("../../../common").ConnectorTypes.jira;
                    fields: {
                        issueType: string | null;
                        priority: string | null;
                        parent: string | null;
                        otherFields?: string | null | undefined;
                    } | null;
                    name: string;
                } | {
                    id: string;
                    type: import("../../../common").ConnectorTypes.none;
                    fields: null;
                    name: string;
                } | {
                    id: string;
                    type: import("../../../common").ConnectorTypes.resilient;
                    fields: {
                        incidentTypes: string[] | null;
                        severityCode: string | null;
                        additionalFields?: string | null | undefined;
                    } | null;
                    additionalFields?: string | null | undefined;
                    name: string;
                } | {
                    id: string;
                    type: import("../../../common").ConnectorTypes.serviceNowITSM;
                    fields: {
                        impact: string | null;
                        severity: string | null;
                        urgency: string | null;
                        category: string | null;
                        subcategory: string | null;
                        additionalFields?: string | null | undefined;
                    } | null;
                    name: string;
                } | {
                    id: string;
                    type: import("../../../common").ConnectorTypes.serviceNowSIR;
                    fields: {
                        category: string | null;
                        destIp: boolean | null;
                        malwareHash: boolean | null;
                        malwareUrl: boolean | null;
                        priority: string | null;
                        sourceIp: boolean | null;
                        subcategory: string | null;
                        additionalFields?: string | null | undefined;
                    } | null;
                    name: string;
                } | {
                    id: string;
                    type: import("../../../common").ConnectorTypes.swimlane;
                    fields: {
                        caseId: string | null;
                    } | null;
                    name: string;
                } | {
                    id: string;
                    type: import("../../../common").ConnectorTypes.theHive;
                    fields: {
                        tlp: number | null;
                    } | null;
                    name: string;
                } | undefined;
                severity?: import("../../../common").CaseSeverity | undefined;
                assignees?: {
                    uid: string;
                }[] | undefined;
                category?: string | null | undefined;
                customFields?: ({
                    key: string;
                    type: import("../../../common/types/domain").CustomFieldTypes.TOGGLE;
                    value: boolean | null;
                } | {
                    key: string;
                    type: import("../../../common/types/domain").CustomFieldTypes.TEXT;
                    value: string | null;
                } | {
                    key: string;
                    type: import("../../../common/types/domain").CustomFieldTypes.NUMBER;
                    value: number | null;
                })[] | undefined;
                settings?: {
                    syncAlerts: boolean;
                    extractObservables?: boolean | undefined;
                } | undefined;
                template?: {
                    id: string;
                    version: number;
                } | null | undefined;
                extendedFields?: {
                    [x: string]: string;
                } | undefined;
                closeReason?: string | undefined;
            } | null;
            description?: string | undefined;
            tags?: string[] | undefined;
        }[] | undefined;
        observableTypes?: {
            key: string;
            label: string;
        }[] | undefined;
    }, "owner"> & {
        id: string;
        version: string;
    }, unknown>;
    onClickUpdateConnector: () => void;
    onAddNewConnector: () => void;
    onChangeConnector: (id: string) => void;
    onChangeClosureType: (type: ClosureType) => void;
    ConnectorAddFlyout: React.ReactElement<import("@kbn/triggers-actions-ui-plugin/public/types").CreateConnectorFlyoutProps, string | React.JSXElementConstructor<any>> | null;
    ConnectorEditFlyout: React.ReactElement<import("@kbn/triggers-actions-ui-plugin/public/types").EditConnectorFlyoutProps, string | React.JSXElementConstructor<any>> | null;
    onEditObservableType: (key: string) => void;
    onDeleteObservableType: (key: string) => void;
    AddOrEditObservableTypeFlyout: React.JSX.Element | null;
};
export type UseConfigureCasesController = ReturnType<typeof useConfigureCasesController>;
