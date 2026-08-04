export declare const customLinksRouteDefinitions: {
    transaction: {
        endpoint: "GET /internal/apm/settings/custom_links/transaction";
        params?: import("zod").ZodObject<{
            query: import("zod").ZodOptional<import("zod").ZodObject<{
                'service.name': import("zod").ZodOptional<import("zod").ZodString>;
                'service.environment': import("zod").ZodOptional<import("zod").ZodString>;
                'transaction.name': import("zod").ZodOptional<import("zod").ZodString>;
                'transaction.type': import("zod").ZodOptional<import("zod").ZodString>;
            }, import("zod/v4/core").$strip>>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("@kbn/apm-types").Transaction>;
    list: {
        endpoint: "GET /internal/apm/settings/custom_links";
        params?: import("zod").ZodObject<{
            query: import("zod").ZodOptional<import("zod").ZodObject<{
                'service.name': import("zod").ZodOptional<import("zod").ZodString>;
                'service.environment': import("zod").ZodOptional<import("zod").ZodString>;
                'transaction.name': import("zod").ZodOptional<import("zod").ZodString>;
                'transaction.type': import("zod").ZodOptional<import("zod").ZodString>;
            }, import("zod/v4/core").$strip>>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./list_custom_links").ListCustomLinksResponse>;
    create: {
        endpoint: "POST /internal/apm/settings/custom_links";
        params?: import("zod").ZodObject<{
            body: import("zod").ZodObject<{
                label: import("zod").ZodString;
                url: import("zod").ZodString;
                id: import("zod").ZodOptional<import("zod").ZodString>;
                filters: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodObject<{
                    key: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"">, import("zod").ZodEnum<{
                        "service.name": "service.name";
                        "transaction.name": "transaction.name";
                        "transaction.type": "transaction.type";
                        "service.environment": "service.environment";
                    }>]>;
                    value: import("zod").ZodString;
                }, import("zod/v4/core").$strip>>>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<void>;
    update: {
        endpoint: "PUT /internal/apm/settings/custom_links/{id}";
        params?: import("zod").ZodObject<{
            path: import("zod").ZodObject<{
                id: import("zod").ZodString;
            }, import("zod/v4/core").$strip>;
            body: import("zod").ZodObject<{
                label: import("zod").ZodString;
                url: import("zod").ZodString;
                id: import("zod").ZodOptional<import("zod").ZodString>;
                filters: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodObject<{
                    key: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"">, import("zod").ZodEnum<{
                        "service.name": "service.name";
                        "transaction.name": "transaction.name";
                        "transaction.type": "transaction.type";
                        "service.environment": "service.environment";
                    }>]>;
                    value: import("zod").ZodString;
                }, import("zod/v4/core").$strip>>>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<void>;
    delete: {
        endpoint: "DELETE /internal/apm/settings/custom_links/{id}";
        params?: import("zod").ZodObject<{
            path: import("zod").ZodObject<{
                id: import("zod").ZodString;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./delete_custom_link").DeleteCustomLinkResponse>;
};
export type { CustomLinkTransactionResponse } from './custom_link_transaction';
export type { ListCustomLinksResponse } from './list_custom_links';
export type { DeleteCustomLinkResponse } from './delete_custom_link';
export { filterOptionsSchema, payloadSchema } from './custom_link_types';
