import { z } from '@kbn/zod/v4';
/**
 * Trace Data
 */
export type TraceData = z.infer<typeof TraceData>;
export declare const TraceData: z.ZodObject<{
    transactionId: z.ZodOptional<z.ZodString>;
    traceId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
/**
 * The type of interrupt
 */
export type InterruptType = z.infer<typeof InterruptType>;
export declare const InterruptType: z.ZodEnum<{
    SELECT_OPTION: "SELECT_OPTION";
    INPUT_TEXT: "INPUT_TEXT";
}>;
export type InterruptTypeEnum = typeof InterruptType.enum;
export declare const InterruptTypeEnum: {
    SELECT_OPTION: "SELECT_OPTION";
    INPUT_TEXT: "INPUT_TEXT";
};
/**
 * The basis of an agent interrupt
 */
export type BaseInterruptValue = z.infer<typeof BaseInterruptValue>;
export declare const BaseInterruptValue: z.ZodObject<{
    type: z.ZodEnum<{
        SELECT_OPTION: "SELECT_OPTION";
        INPUT_TEXT: "INPUT_TEXT";
    }>;
    expired: z.ZodOptional<z.ZodBoolean>;
    threadId: z.ZodString;
}, z.core.$strip>;
/**
 * The basis of an interrupt resume value
 */
export type BaseInterruptResumeValue = z.infer<typeof BaseInterruptResumeValue>;
export declare const BaseInterruptResumeValue: z.ZodObject<{
    type: z.ZodEnum<{
        SELECT_OPTION: "SELECT_OPTION";
        INPUT_TEXT: "INPUT_TEXT";
    }>;
}, z.core.$strip>;
/**
 * A request approval option
 */
export type SelectOptionInterruptOption = z.infer<typeof SelectOptionInterruptOption>;
export declare const SelectOptionInterruptOption: z.ZodObject<{
    label: z.ZodString;
    value: z.ZodString;
    buttonColor: z.ZodOptional<z.ZodEnum<{
        text: "text";
        primary: "primary";
        success: "success";
        accent: "accent";
        danger: "danger";
        warning: "warning";
        neutral: "neutral";
        risk: "risk";
        accentSecondary: "accentSecondary";
    }>>;
}, z.core.$strip>;
/**
 * Interrupt that requests user to select one of the provided options
 */
export type SelectOptionInterruptValue = z.infer<typeof SelectOptionInterruptValue>;
export declare const SelectOptionInterruptValue: z.ZodObject<{
    expired: z.ZodOptional<z.ZodBoolean>;
    threadId: z.ZodString;
    type: z.ZodLiteral<"SELECT_OPTION">;
    description: z.ZodString;
    options: z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        value: z.ZodString;
        buttonColor: z.ZodOptional<z.ZodEnum<{
            text: "text";
            primary: "primary";
            success: "success";
            accent: "accent";
            danger: "danger";
            warning: "warning";
            neutral: "neutral";
            risk: "risk";
            accentSecondary: "accentSecondary";
        }>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
/**
 * A request approval resume schema
 */
export type SelectOptionInterruptResumeValue = z.infer<typeof SelectOptionInterruptResumeValue>;
export declare const SelectOptionInterruptResumeValue: z.ZodObject<{
    type: z.ZodLiteral<"SELECT_OPTION">;
    value: z.ZodString;
}, z.core.$strip>;
/**
 * A request approval interrupt
 */
export type SelectOptionInterrupt = z.infer<typeof SelectOptionInterrupt>;
export declare const SelectOptionInterrupt: z.ZodObject<{
    interruptValue: z.ZodObject<{
        expired: z.ZodOptional<z.ZodBoolean>;
        threadId: z.ZodString;
        type: z.ZodLiteral<"SELECT_OPTION">;
        description: z.ZodString;
        options: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            value: z.ZodString;
            buttonColor: z.ZodOptional<z.ZodEnum<{
                text: "text";
                primary: "primary";
                success: "success";
                accent: "accent";
                danger: "danger";
                warning: "warning";
                neutral: "neutral";
                risk: "risk";
                accentSecondary: "accentSecondary";
            }>>;
        }, z.core.$strip>>;
    }, z.core.$strip>;
    resumeValue: z.ZodObject<{
        type: z.ZodLiteral<"SELECT_OPTION">;
        value: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
/**
 * Interrupt that requests user to provide text input
 */
export type InputTextInterruptValue = z.infer<typeof InputTextInterruptValue>;
export declare const InputTextInterruptValue: z.ZodObject<{
    expired: z.ZodOptional<z.ZodBoolean>;
    threadId: z.ZodString;
    type: z.ZodLiteral<"INPUT_TEXT">;
    description: z.ZodOptional<z.ZodString>;
    placeholder: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
/**
 * A resume value for input text
 */
export type InputTextInterruptResumeValue = z.infer<typeof InputTextInterruptResumeValue>;
export declare const InputTextInterruptResumeValue: z.ZodObject<{
    type: z.ZodLiteral<"INPUT_TEXT">;
    value: z.ZodString;
}, z.core.$strip>;
/**
 * A request text interrupt
 */
export type InputTextInterrupt = z.infer<typeof InputTextInterrupt>;
export declare const InputTextInterrupt: z.ZodObject<{
    interruptValue: z.ZodObject<{
        expired: z.ZodOptional<z.ZodBoolean>;
        threadId: z.ZodString;
        type: z.ZodLiteral<"INPUT_TEXT">;
        description: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    resumeValue: z.ZodObject<{
        type: z.ZodLiteral<"INPUT_TEXT">;
        value: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
/**
 * Union of the interrupt values
 */
export type InterruptValue = z.infer<typeof InterruptValue>;
export declare const InterruptValue: z.ZodUnion<readonly [z.ZodObject<{
    expired: z.ZodOptional<z.ZodBoolean>;
    threadId: z.ZodString;
    type: z.ZodLiteral<"SELECT_OPTION">;
    description: z.ZodString;
    options: z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        value: z.ZodString;
        buttonColor: z.ZodOptional<z.ZodEnum<{
            text: "text";
            primary: "primary";
            success: "success";
            accent: "accent";
            danger: "danger";
            warning: "warning";
            neutral: "neutral";
            risk: "risk";
            accentSecondary: "accentSecondary";
        }>>;
    }, z.core.$strip>>;
}, z.core.$strip>, z.ZodObject<{
    expired: z.ZodOptional<z.ZodBoolean>;
    threadId: z.ZodString;
    type: z.ZodLiteral<"INPUT_TEXT">;
    description: z.ZodOptional<z.ZodString>;
    placeholder: z.ZodOptional<z.ZodString>;
}, z.core.$strip>]>;
/**
 * Union of the interrupt resume values
 */
export type InterruptResumeValue = z.infer<typeof InterruptResumeValue>;
export declare const InterruptResumeValue: z.ZodUnion<readonly [z.ZodObject<{
    type: z.ZodLiteral<"SELECT_OPTION">;
    value: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"INPUT_TEXT">;
    value: z.ZodString;
}, z.core.$strip>]>;
/**
 * The basis of a content reference
 */
export type BaseContentReference = z.infer<typeof BaseContentReference>;
export declare const BaseContentReference: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodString;
}, z.core.$strip>;
/**
 * References a knowledge base entry
 */
export type KnowledgeBaseEntryContentReference = z.infer<typeof KnowledgeBaseEntryContentReference>;
export declare const KnowledgeBaseEntryContentReference: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodLiteral<"KnowledgeBaseEntry">;
    knowledgeBaseEntryId: z.ZodString;
    knowledgeBaseEntryName: z.ZodString;
}, z.core.$strip>;
/**
 * References an ESQL query
 */
export type EsqlContentReference = z.infer<typeof EsqlContentReference>;
export declare const EsqlContentReference: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodLiteral<"EsqlQuery">;
    query: z.ZodString;
    label: z.ZodString;
    timerange: z.ZodOptional<z.ZodObject<{
        from: z.ZodString;
        to: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>;
/**
 * References a security alert
 */
export type SecurityAlertContentReference = z.infer<typeof SecurityAlertContentReference>;
export declare const SecurityAlertContentReference: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodLiteral<"SecurityAlert">;
    alertId: z.ZodString;
}, z.core.$strip>;
/**
 * References an external URL
 */
export type HrefContentReference = z.infer<typeof HrefContentReference>;
export declare const HrefContentReference: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodLiteral<"Href">;
    label: z.ZodOptional<z.ZodString>;
    href: z.ZodString;
}, z.core.$strip>;
/**
 * References the security alerts page
 */
export type SecurityAlertsPageContentReference = z.infer<typeof SecurityAlertsPageContentReference>;
export declare const SecurityAlertsPageContentReference: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodLiteral<"SecurityAlertsPage">;
}, z.core.$strip>;
/**
 * References the product documentation
 */
export type ProductDocumentationContentReference = z.infer<typeof ProductDocumentationContentReference>;
export declare const ProductDocumentationContentReference: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodLiteral<"ProductDocumentation">;
    title: z.ZodString;
    url: z.ZodString;
}, z.core.$strip>;
/**
 * A content reference
 */
export declare const ContentReferenceInternal: z.ZodUnion<readonly [z.ZodObject<{
    id: z.ZodString;
    type: z.ZodLiteral<"KnowledgeBaseEntry">;
    knowledgeBaseEntryId: z.ZodString;
    knowledgeBaseEntryName: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    type: z.ZodLiteral<"SecurityAlert">;
    alertId: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    type: z.ZodLiteral<"SecurityAlertsPage">;
}, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    type: z.ZodLiteral<"ProductDocumentation">;
    title: z.ZodString;
    url: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    type: z.ZodLiteral<"EsqlQuery">;
    query: z.ZodString;
    label: z.ZodString;
    timerange: z.ZodOptional<z.ZodObject<{
        from: z.ZodString;
        to: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    type: z.ZodLiteral<"Href">;
    label: z.ZodOptional<z.ZodString>;
    href: z.ZodString;
}, z.core.$strip>]>;
export type ContentReference = z.infer<typeof ContentReferenceInternal>;
export declare const ContentReference: z.ZodType<ContentReference>;
/**
 * A union of all content reference types
 */
export type ContentReferences = z.infer<typeof ContentReferences>;
export declare const ContentReferences: z.ZodObject<{}, z.core.$catchall<z.ZodUnion<readonly [z.ZodObject<{
    id: z.ZodString;
    type: z.ZodLiteral<"KnowledgeBaseEntry">;
    knowledgeBaseEntryId: z.ZodString;
    knowledgeBaseEntryName: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    type: z.ZodLiteral<"SecurityAlert">;
    alertId: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    type: z.ZodLiteral<"SecurityAlertsPage">;
}, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    type: z.ZodLiteral<"ProductDocumentation">;
    title: z.ZodString;
    url: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    type: z.ZodLiteral<"EsqlQuery">;
    query: z.ZodString;
    label: z.ZodString;
    timerange: z.ZodOptional<z.ZodObject<{
        from: z.ZodString;
        to: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    type: z.ZodLiteral<"Href">;
    label: z.ZodOptional<z.ZodString>;
    href: z.ZodString;
}, z.core.$strip>]>>>;
/**
 * Message metadata
 */
export type MessageMetadata = z.infer<typeof MessageMetadata>;
export declare const MessageMetadata: z.ZodObject<{
    contentReferences: z.ZodOptional<z.ZodObject<{}, z.core.$catchall<z.ZodUnion<readonly [z.ZodObject<{
        id: z.ZodString;
        type: z.ZodLiteral<"KnowledgeBaseEntry">;
        knowledgeBaseEntryId: z.ZodString;
        knowledgeBaseEntryName: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        id: z.ZodString;
        type: z.ZodLiteral<"SecurityAlert">;
        alertId: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        id: z.ZodString;
        type: z.ZodLiteral<"SecurityAlertsPage">;
    }, z.core.$strip>, z.ZodObject<{
        id: z.ZodString;
        type: z.ZodLiteral<"ProductDocumentation">;
        title: z.ZodString;
        url: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        id: z.ZodString;
        type: z.ZodLiteral<"EsqlQuery">;
        query: z.ZodString;
        label: z.ZodString;
        timerange: z.ZodOptional<z.ZodObject<{
            from: z.ZodString;
            to: z.ZodString;
        }, z.core.$strip>>;
    }, z.core.$strip>, z.ZodObject<{
        id: z.ZodString;
        type: z.ZodLiteral<"Href">;
        label: z.ZodOptional<z.ZodString>;
        href: z.ZodString;
    }, z.core.$strip>]>>>>;
    interruptValue: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
        expired: z.ZodOptional<z.ZodBoolean>;
        threadId: z.ZodString;
        type: z.ZodLiteral<"SELECT_OPTION">;
        description: z.ZodString;
        options: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            value: z.ZodString;
            buttonColor: z.ZodOptional<z.ZodEnum<{
                text: "text";
                primary: "primary";
                success: "success";
                accent: "accent";
                danger: "danger";
                warning: "warning";
                neutral: "neutral";
                risk: "risk";
                accentSecondary: "accentSecondary";
            }>>;
        }, z.core.$strip>>;
    }, z.core.$strip>, z.ZodObject<{
        expired: z.ZodOptional<z.ZodBoolean>;
        threadId: z.ZodString;
        type: z.ZodLiteral<"INPUT_TEXT">;
        description: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>]>>;
    interruptResumeValue: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
        type: z.ZodLiteral<"SELECT_OPTION">;
        value: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"INPUT_TEXT">;
        value: z.ZodString;
    }, z.core.$strip>]>>;
}, z.core.$strip>;
/**
 * Replacements object used to anonymize/deanonymize messages
 */
export type Replacements = z.infer<typeof Replacements>;
export declare const Replacements: z.ZodObject<{}, z.core.$catchall<z.ZodString>>;
export type Reader = z.infer<typeof Reader>;
export declare const Reader: z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>;
/**
 * Provider
 */
export type Provider = z.infer<typeof Provider>;
export declare const Provider: z.ZodEnum<{
    Other: "Other";
    "Azure OpenAI": "Azure OpenAI";
    OpenAI: "OpenAI";
}>;
export type ProviderEnum = typeof Provider.enum;
export declare const ProviderEnum: {
    Other: "Other";
    "Azure OpenAI": "Azure OpenAI";
    OpenAI: "OpenAI";
};
/**
 * Message role.
 */
export type MessageRole = z.infer<typeof MessageRole>;
export declare const MessageRole: z.ZodEnum<{
    user: "user";
    system: "system";
    assistant: "assistant";
}>;
export type MessageRoleEnum = typeof MessageRole.enum;
export declare const MessageRoleEnum: {
    user: "user";
    system: "system";
    assistant: "assistant";
};
/**
 * The conversation category.
 */
export type ConversationCategory = z.infer<typeof ConversationCategory>;
export declare const ConversationCategory: z.ZodEnum<{
    assistant: "assistant";
    insights: "insights";
}>;
export type ConversationCategoryEnum = typeof ConversationCategory.enum;
export declare const ConversationCategoryEnum: {
    assistant: "assistant";
    insights: "insights";
};
/**
 * AI assistant conversation message.
 */
export type Message = z.infer<typeof Message>;
export declare const Message: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    content: z.ZodString;
    refusal: z.ZodOptional<z.ZodString>;
    reader: z.ZodOptional<z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>>;
    role: z.ZodEnum<{
        user: "user";
        system: "system";
        assistant: "assistant";
    }>;
    user: z.ZodOptional<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    timestamp: z.ZodString;
    isError: z.ZodOptional<z.ZodBoolean>;
    traceData: z.ZodOptional<z.ZodObject<{
        transactionId: z.ZodOptional<z.ZodString>;
        traceId: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    metadata: z.ZodOptional<z.ZodObject<{
        contentReferences: z.ZodOptional<z.ZodObject<{}, z.core.$catchall<z.ZodUnion<readonly [z.ZodObject<{
            id: z.ZodString;
            type: z.ZodLiteral<"KnowledgeBaseEntry">;
            knowledgeBaseEntryId: z.ZodString;
            knowledgeBaseEntryName: z.ZodString;
        }, z.core.$strip>, z.ZodObject<{
            id: z.ZodString;
            type: z.ZodLiteral<"SecurityAlert">;
            alertId: z.ZodString;
        }, z.core.$strip>, z.ZodObject<{
            id: z.ZodString;
            type: z.ZodLiteral<"SecurityAlertsPage">;
        }, z.core.$strip>, z.ZodObject<{
            id: z.ZodString;
            type: z.ZodLiteral<"ProductDocumentation">;
            title: z.ZodString;
            url: z.ZodString;
        }, z.core.$strip>, z.ZodObject<{
            id: z.ZodString;
            type: z.ZodLiteral<"EsqlQuery">;
            query: z.ZodString;
            label: z.ZodString;
            timerange: z.ZodOptional<z.ZodObject<{
                from: z.ZodString;
                to: z.ZodString;
            }, z.core.$strip>>;
        }, z.core.$strip>, z.ZodObject<{
            id: z.ZodString;
            type: z.ZodLiteral<"Href">;
            label: z.ZodOptional<z.ZodString>;
            href: z.ZodString;
        }, z.core.$strip>]>>>>;
        interruptValue: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
            expired: z.ZodOptional<z.ZodBoolean>;
            threadId: z.ZodString;
            type: z.ZodLiteral<"SELECT_OPTION">;
            description: z.ZodString;
            options: z.ZodArray<z.ZodObject<{
                label: z.ZodString;
                value: z.ZodString;
                buttonColor: z.ZodOptional<z.ZodEnum<{
                    text: "text";
                    primary: "primary";
                    success: "success";
                    accent: "accent";
                    danger: "danger";
                    warning: "warning";
                    neutral: "neutral";
                    risk: "risk";
                    accentSecondary: "accentSecondary";
                }>>;
            }, z.core.$strip>>;
        }, z.core.$strip>, z.ZodObject<{
            expired: z.ZodOptional<z.ZodBoolean>;
            threadId: z.ZodString;
            type: z.ZodLiteral<"INPUT_TEXT">;
            description: z.ZodOptional<z.ZodString>;
            placeholder: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>]>>;
        interruptResumeValue: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
            type: z.ZodLiteral<"SELECT_OPTION">;
            value: z.ZodString;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"INPUT_TEXT">;
            value: z.ZodString;
        }, z.core.$strip>]>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type ApiConfig = z.infer<typeof ApiConfig>;
export declare const ApiConfig: z.ZodObject<{
    connectorId: z.ZodString;
    actionTypeId: z.ZodString;
    defaultSystemPromptId: z.ZodOptional<z.ZodString>;
    provider: z.ZodOptional<z.ZodEnum<{
        Other: "Other";
        "Azure OpenAI": "Azure OpenAI";
        OpenAI: "OpenAI";
    }>>;
    model: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type ErrorSchema = z.infer<typeof ErrorSchema>;
export declare const ErrorSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    error: z.ZodObject<{
        status_code: z.ZodNumber;
        message: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strict>;
export type ConversationResponse = z.infer<typeof ConversationResponse>;
export declare const ConversationResponse: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    category: z.ZodEnum<{
        assistant: "assistant";
        insights: "insights";
    }>;
    timestamp: z.ZodOptional<z.ZodString>;
    updatedAt: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodString;
    replacements: z.ZodOptional<z.ZodObject<{}, z.core.$catchall<z.ZodString>>>;
    createdBy: z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    users: z.ZodArray<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    messages: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        content: z.ZodString;
        refusal: z.ZodOptional<z.ZodString>;
        reader: z.ZodOptional<z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>>;
        role: z.ZodEnum<{
            user: "user";
            system: "system";
            assistant: "assistant";
        }>;
        user: z.ZodOptional<z.ZodObject<{
            id: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        timestamp: z.ZodString;
        isError: z.ZodOptional<z.ZodBoolean>;
        traceData: z.ZodOptional<z.ZodObject<{
            transactionId: z.ZodOptional<z.ZodString>;
            traceId: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        metadata: z.ZodOptional<z.ZodObject<{
            contentReferences: z.ZodOptional<z.ZodObject<{}, z.core.$catchall<z.ZodUnion<readonly [z.ZodObject<{
                id: z.ZodString;
                type: z.ZodLiteral<"KnowledgeBaseEntry">;
                knowledgeBaseEntryId: z.ZodString;
                knowledgeBaseEntryName: z.ZodString;
            }, z.core.$strip>, z.ZodObject<{
                id: z.ZodString;
                type: z.ZodLiteral<"SecurityAlert">;
                alertId: z.ZodString;
            }, z.core.$strip>, z.ZodObject<{
                id: z.ZodString;
                type: z.ZodLiteral<"SecurityAlertsPage">;
            }, z.core.$strip>, z.ZodObject<{
                id: z.ZodString;
                type: z.ZodLiteral<"ProductDocumentation">;
                title: z.ZodString;
                url: z.ZodString;
            }, z.core.$strip>, z.ZodObject<{
                id: z.ZodString;
                type: z.ZodLiteral<"EsqlQuery">;
                query: z.ZodString;
                label: z.ZodString;
                timerange: z.ZodOptional<z.ZodObject<{
                    from: z.ZodString;
                    to: z.ZodString;
                }, z.core.$strip>>;
            }, z.core.$strip>, z.ZodObject<{
                id: z.ZodString;
                type: z.ZodLiteral<"Href">;
                label: z.ZodOptional<z.ZodString>;
                href: z.ZodString;
            }, z.core.$strip>]>>>>;
            interruptValue: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                expired: z.ZodOptional<z.ZodBoolean>;
                threadId: z.ZodString;
                type: z.ZodLiteral<"SELECT_OPTION">;
                description: z.ZodString;
                options: z.ZodArray<z.ZodObject<{
                    label: z.ZodString;
                    value: z.ZodString;
                    buttonColor: z.ZodOptional<z.ZodEnum<{
                        text: "text";
                        primary: "primary";
                        success: "success";
                        accent: "accent";
                        danger: "danger";
                        warning: "warning";
                        neutral: "neutral";
                        risk: "risk";
                        accentSecondary: "accentSecondary";
                    }>>;
                }, z.core.$strip>>;
            }, z.core.$strip>, z.ZodObject<{
                expired: z.ZodOptional<z.ZodBoolean>;
                threadId: z.ZodString;
                type: z.ZodLiteral<"INPUT_TEXT">;
                description: z.ZodOptional<z.ZodString>;
                placeholder: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>]>>;
            interruptResumeValue: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                type: z.ZodLiteral<"SELECT_OPTION">;
                value: z.ZodString;
            }, z.core.$strip>, z.ZodObject<{
                type: z.ZodLiteral<"INPUT_TEXT">;
                value: z.ZodString;
            }, z.core.$strip>]>>;
        }, z.core.$strip>>;
    }, z.core.$strip>>>;
    apiConfig: z.ZodOptional<z.ZodObject<{
        connectorId: z.ZodString;
        actionTypeId: z.ZodString;
        defaultSystemPromptId: z.ZodOptional<z.ZodString>;
        provider: z.ZodOptional<z.ZodEnum<{
            Other: "Other";
            "Azure OpenAI": "Azure OpenAI";
            OpenAI: "OpenAI";
        }>>;
        model: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    excludeFromLastConversationStorage: z.ZodOptional<z.ZodBoolean>;
    namespace: z.ZodString;
}, z.core.$strip>;
export type ConversationUpdateProps = z.infer<typeof ConversationUpdateProps>;
export declare const ConversationUpdateProps: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodEnum<{
        assistant: "assistant";
        insights: "insights";
    }>>;
    messages: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        content: z.ZodString;
        refusal: z.ZodOptional<z.ZodString>;
        reader: z.ZodOptional<z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>>;
        role: z.ZodEnum<{
            user: "user";
            system: "system";
            assistant: "assistant";
        }>;
        user: z.ZodOptional<z.ZodObject<{
            id: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        timestamp: z.ZodString;
        isError: z.ZodOptional<z.ZodBoolean>;
        traceData: z.ZodOptional<z.ZodObject<{
            transactionId: z.ZodOptional<z.ZodString>;
            traceId: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        metadata: z.ZodOptional<z.ZodObject<{
            contentReferences: z.ZodOptional<z.ZodObject<{}, z.core.$catchall<z.ZodUnion<readonly [z.ZodObject<{
                id: z.ZodString;
                type: z.ZodLiteral<"KnowledgeBaseEntry">;
                knowledgeBaseEntryId: z.ZodString;
                knowledgeBaseEntryName: z.ZodString;
            }, z.core.$strip>, z.ZodObject<{
                id: z.ZodString;
                type: z.ZodLiteral<"SecurityAlert">;
                alertId: z.ZodString;
            }, z.core.$strip>, z.ZodObject<{
                id: z.ZodString;
                type: z.ZodLiteral<"SecurityAlertsPage">;
            }, z.core.$strip>, z.ZodObject<{
                id: z.ZodString;
                type: z.ZodLiteral<"ProductDocumentation">;
                title: z.ZodString;
                url: z.ZodString;
            }, z.core.$strip>, z.ZodObject<{
                id: z.ZodString;
                type: z.ZodLiteral<"EsqlQuery">;
                query: z.ZodString;
                label: z.ZodString;
                timerange: z.ZodOptional<z.ZodObject<{
                    from: z.ZodString;
                    to: z.ZodString;
                }, z.core.$strip>>;
            }, z.core.$strip>, z.ZodObject<{
                id: z.ZodString;
                type: z.ZodLiteral<"Href">;
                label: z.ZodOptional<z.ZodString>;
                href: z.ZodString;
            }, z.core.$strip>]>>>>;
            interruptValue: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                expired: z.ZodOptional<z.ZodBoolean>;
                threadId: z.ZodString;
                type: z.ZodLiteral<"SELECT_OPTION">;
                description: z.ZodString;
                options: z.ZodArray<z.ZodObject<{
                    label: z.ZodString;
                    value: z.ZodString;
                    buttonColor: z.ZodOptional<z.ZodEnum<{
                        text: "text";
                        primary: "primary";
                        success: "success";
                        accent: "accent";
                        danger: "danger";
                        warning: "warning";
                        neutral: "neutral";
                        risk: "risk";
                        accentSecondary: "accentSecondary";
                    }>>;
                }, z.core.$strip>>;
            }, z.core.$strip>, z.ZodObject<{
                expired: z.ZodOptional<z.ZodBoolean>;
                threadId: z.ZodString;
                type: z.ZodLiteral<"INPUT_TEXT">;
                description: z.ZodOptional<z.ZodString>;
                placeholder: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>]>>;
            interruptResumeValue: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                type: z.ZodLiteral<"SELECT_OPTION">;
                value: z.ZodString;
            }, z.core.$strip>, z.ZodObject<{
                type: z.ZodLiteral<"INPUT_TEXT">;
                value: z.ZodString;
            }, z.core.$strip>]>>;
        }, z.core.$strip>>;
    }, z.core.$strip>>>;
    apiConfig: z.ZodOptional<z.ZodObject<{
        connectorId: z.ZodString;
        actionTypeId: z.ZodString;
        defaultSystemPromptId: z.ZodOptional<z.ZodString>;
        provider: z.ZodOptional<z.ZodEnum<{
            Other: "Other";
            "Azure OpenAI": "Azure OpenAI";
            OpenAI: "OpenAI";
        }>>;
        model: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    excludeFromLastConversationStorage: z.ZodOptional<z.ZodBoolean>;
    replacements: z.ZodOptional<z.ZodObject<{}, z.core.$catchall<z.ZodString>>>;
    users: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export type ConversationCreateProps = z.infer<typeof ConversationCreateProps>;
export declare const ConversationCreateProps: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    title: z.ZodString;
    category: z.ZodOptional<z.ZodEnum<{
        assistant: "assistant";
        insights: "insights";
    }>>;
    messages: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        content: z.ZodString;
        refusal: z.ZodOptional<z.ZodString>;
        reader: z.ZodOptional<z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>>;
        role: z.ZodEnum<{
            user: "user";
            system: "system";
            assistant: "assistant";
        }>;
        user: z.ZodOptional<z.ZodObject<{
            id: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        timestamp: z.ZodString;
        isError: z.ZodOptional<z.ZodBoolean>;
        traceData: z.ZodOptional<z.ZodObject<{
            transactionId: z.ZodOptional<z.ZodString>;
            traceId: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        metadata: z.ZodOptional<z.ZodObject<{
            contentReferences: z.ZodOptional<z.ZodObject<{}, z.core.$catchall<z.ZodUnion<readonly [z.ZodObject<{
                id: z.ZodString;
                type: z.ZodLiteral<"KnowledgeBaseEntry">;
                knowledgeBaseEntryId: z.ZodString;
                knowledgeBaseEntryName: z.ZodString;
            }, z.core.$strip>, z.ZodObject<{
                id: z.ZodString;
                type: z.ZodLiteral<"SecurityAlert">;
                alertId: z.ZodString;
            }, z.core.$strip>, z.ZodObject<{
                id: z.ZodString;
                type: z.ZodLiteral<"SecurityAlertsPage">;
            }, z.core.$strip>, z.ZodObject<{
                id: z.ZodString;
                type: z.ZodLiteral<"ProductDocumentation">;
                title: z.ZodString;
                url: z.ZodString;
            }, z.core.$strip>, z.ZodObject<{
                id: z.ZodString;
                type: z.ZodLiteral<"EsqlQuery">;
                query: z.ZodString;
                label: z.ZodString;
                timerange: z.ZodOptional<z.ZodObject<{
                    from: z.ZodString;
                    to: z.ZodString;
                }, z.core.$strip>>;
            }, z.core.$strip>, z.ZodObject<{
                id: z.ZodString;
                type: z.ZodLiteral<"Href">;
                label: z.ZodOptional<z.ZodString>;
                href: z.ZodString;
            }, z.core.$strip>]>>>>;
            interruptValue: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                expired: z.ZodOptional<z.ZodBoolean>;
                threadId: z.ZodString;
                type: z.ZodLiteral<"SELECT_OPTION">;
                description: z.ZodString;
                options: z.ZodArray<z.ZodObject<{
                    label: z.ZodString;
                    value: z.ZodString;
                    buttonColor: z.ZodOptional<z.ZodEnum<{
                        text: "text";
                        primary: "primary";
                        success: "success";
                        accent: "accent";
                        danger: "danger";
                        warning: "warning";
                        neutral: "neutral";
                        risk: "risk";
                        accentSecondary: "accentSecondary";
                    }>>;
                }, z.core.$strip>>;
            }, z.core.$strip>, z.ZodObject<{
                expired: z.ZodOptional<z.ZodBoolean>;
                threadId: z.ZodString;
                type: z.ZodLiteral<"INPUT_TEXT">;
                description: z.ZodOptional<z.ZodString>;
                placeholder: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>]>>;
            interruptResumeValue: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                type: z.ZodLiteral<"SELECT_OPTION">;
                value: z.ZodString;
            }, z.core.$strip>, z.ZodObject<{
                type: z.ZodLiteral<"INPUT_TEXT">;
                value: z.ZodString;
            }, z.core.$strip>]>>;
        }, z.core.$strip>>;
    }, z.core.$strip>>>;
    apiConfig: z.ZodOptional<z.ZodObject<{
        connectorId: z.ZodString;
        actionTypeId: z.ZodString;
        defaultSystemPromptId: z.ZodOptional<z.ZodString>;
        provider: z.ZodOptional<z.ZodEnum<{
            Other: "Other";
            "Azure OpenAI": "Azure OpenAI";
            OpenAI: "OpenAI";
        }>>;
        model: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    excludeFromLastConversationStorage: z.ZodOptional<z.ZodBoolean>;
    replacements: z.ZodOptional<z.ZodObject<{}, z.core.$catchall<z.ZodString>>>;
}, z.core.$strip>;
export type ConversationMessageCreateProps = z.infer<typeof ConversationMessageCreateProps>;
export declare const ConversationMessageCreateProps: z.ZodObject<{
    messages: z.ZodArray<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        content: z.ZodString;
        refusal: z.ZodOptional<z.ZodString>;
        reader: z.ZodOptional<z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>>;
        role: z.ZodEnum<{
            user: "user";
            system: "system";
            assistant: "assistant";
        }>;
        user: z.ZodOptional<z.ZodObject<{
            id: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        timestamp: z.ZodString;
        isError: z.ZodOptional<z.ZodBoolean>;
        traceData: z.ZodOptional<z.ZodObject<{
            transactionId: z.ZodOptional<z.ZodString>;
            traceId: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        metadata: z.ZodOptional<z.ZodObject<{
            contentReferences: z.ZodOptional<z.ZodObject<{}, z.core.$catchall<z.ZodUnion<readonly [z.ZodObject<{
                id: z.ZodString;
                type: z.ZodLiteral<"KnowledgeBaseEntry">;
                knowledgeBaseEntryId: z.ZodString;
                knowledgeBaseEntryName: z.ZodString;
            }, z.core.$strip>, z.ZodObject<{
                id: z.ZodString;
                type: z.ZodLiteral<"SecurityAlert">;
                alertId: z.ZodString;
            }, z.core.$strip>, z.ZodObject<{
                id: z.ZodString;
                type: z.ZodLiteral<"SecurityAlertsPage">;
            }, z.core.$strip>, z.ZodObject<{
                id: z.ZodString;
                type: z.ZodLiteral<"ProductDocumentation">;
                title: z.ZodString;
                url: z.ZodString;
            }, z.core.$strip>, z.ZodObject<{
                id: z.ZodString;
                type: z.ZodLiteral<"EsqlQuery">;
                query: z.ZodString;
                label: z.ZodString;
                timerange: z.ZodOptional<z.ZodObject<{
                    from: z.ZodString;
                    to: z.ZodString;
                }, z.core.$strip>>;
            }, z.core.$strip>, z.ZodObject<{
                id: z.ZodString;
                type: z.ZodLiteral<"Href">;
                label: z.ZodOptional<z.ZodString>;
                href: z.ZodString;
            }, z.core.$strip>]>>>>;
            interruptValue: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                expired: z.ZodOptional<z.ZodBoolean>;
                threadId: z.ZodString;
                type: z.ZodLiteral<"SELECT_OPTION">;
                description: z.ZodString;
                options: z.ZodArray<z.ZodObject<{
                    label: z.ZodString;
                    value: z.ZodString;
                    buttonColor: z.ZodOptional<z.ZodEnum<{
                        text: "text";
                        primary: "primary";
                        success: "success";
                        accent: "accent";
                        danger: "danger";
                        warning: "warning";
                        neutral: "neutral";
                        risk: "risk";
                        accentSecondary: "accentSecondary";
                    }>>;
                }, z.core.$strip>>;
            }, z.core.$strip>, z.ZodObject<{
                expired: z.ZodOptional<z.ZodBoolean>;
                threadId: z.ZodString;
                type: z.ZodLiteral<"INPUT_TEXT">;
                description: z.ZodOptional<z.ZodString>;
                placeholder: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>]>>;
            interruptResumeValue: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                type: z.ZodLiteral<"SELECT_OPTION">;
                value: z.ZodString;
            }, z.core.$strip>, z.ZodObject<{
                type: z.ZodLiteral<"INPUT_TEXT">;
                value: z.ZodString;
            }, z.core.$strip>]>>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
