import { z } from '@kbn/zod/v4';
import type { BaseParams } from '@kbn/reporting-common/types';
export declare function validateTimezone(timezone: string): string | undefined;
export declare const idSchema: z.ZodEnum<{
    canvas: "canvas";
    print: "print";
    png: "png";
    preserve_layout: "preserve_layout";
}>;
export declare const pagingStrategySchema: z.ZodEnum<{
    scroll: "scroll";
    pit: "pit";
}>;
export declare function validateJobParams(jobParams: BaseParams): {
    browserTimezone?: string | undefined;
    objectType?: string | undefined;
    title?: string | undefined;
    version?: string | undefined;
    layout?: {
        id?: "canvas" | "print" | "png" | "preserve_layout" | undefined;
        dimensions?: {
            height: number;
            width: number;
        } | undefined;
        zoom?: number | undefined;
        selectors?: {
            screenshot?: string | undefined;
            renderComplete?: string | undefined;
            renderError?: string | undefined;
            renderErrorAttribute?: string | undefined;
            itemsCountAttribute?: string | undefined;
            timefilterDurationAttribute?: string | undefined;
        } | undefined;
    } | undefined;
    forceNow?: string | undefined;
    pagingStrategy?: "scroll" | "pit" | undefined;
    locatorParams?: {
        id?: string | undefined;
        version?: string | undefined;
        params?: Record<any, any> | undefined;
    } | {
        id?: string | undefined;
        version?: string | undefined;
        params?: Record<any, any> | undefined;
    }[] | null | undefined;
    searchSource?: Record<string, any> | undefined;
    columns?: string[] | undefined;
    relativeUrls?: string[] | undefined;
    relativeUrl?: string | undefined;
    isEsqlMode?: boolean | undefined;
};
