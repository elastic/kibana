import type { z } from '@kbn/zod/v4';
import type { OnboardingResult, TaskResult } from '@kbn/streams-schema';
import type { OnboardingStep } from '@kbn/streams-schema';
export type OnboardingTaskResult = TaskResult<OnboardingResult>;
export declare const onboardingTaskRoute: Record<"POST /internal/streams/{streamName}/onboarding/_task", import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/{streamName}/onboarding/_task", z.ZodObject<{
    path: z.ZodObject<{
        streamName: z.ZodString;
    }, z.core.$strip>;
    body: z.ZodDiscriminatedUnion<[z.ZodObject<{
        action: z.ZodLiteral<"schedule">;
        from: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
        to: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
        steps: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodEnum<typeof OnboardingStep>>>>;
        connectors: z.ZodOptional<z.ZodObject<{
            features: z.ZodOptional<z.ZodString>;
            queries: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>, z.ZodObject<{
        action: z.ZodLiteral<"cancel">;
    }, z.core.$strip>, z.ZodObject<{
        action: z.ZodLiteral<"acknowledge">;
    }, z.core.$strip>], "action">;
}, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, OnboardingTaskResult, undefined>>;
export declare const onboardingStatusRoute: Record<"GET /internal/streams/{streamName}/onboarding/_status", import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/{streamName}/onboarding/_status", z.ZodObject<{
    path: z.ZodObject<{
        streamName: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, OnboardingTaskResult, undefined>>;
export declare const internalOnboardingRoutes: {
    "GET /internal/streams/{streamName}/onboarding/_status": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/{streamName}/onboarding/_status", z.ZodObject<{
        path: z.ZodObject<{
            streamName: z.ZodString;
        }, z.core.$strip>;
    }, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, OnboardingTaskResult, undefined>;
    "POST /internal/streams/{streamName}/onboarding/_task": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/{streamName}/onboarding/_task", z.ZodObject<{
        path: z.ZodObject<{
            streamName: z.ZodString;
        }, z.core.$strip>;
        body: z.ZodDiscriminatedUnion<[z.ZodObject<{
            action: z.ZodLiteral<"schedule">;
            from: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            to: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            steps: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodEnum<typeof OnboardingStep>>>>;
            connectors: z.ZodOptional<z.ZodObject<{
                features: z.ZodOptional<z.ZodString>;
                queries: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>;
        }, z.core.$strip>, z.ZodObject<{
            action: z.ZodLiteral<"cancel">;
        }, z.core.$strip>, z.ZodObject<{
            action: z.ZodLiteral<"acknowledge">;
        }, z.core.$strip>], "action">;
    }, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, OnboardingTaskResult, undefined>;
};
