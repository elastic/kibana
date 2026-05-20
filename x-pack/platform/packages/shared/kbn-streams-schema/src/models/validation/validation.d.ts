import type { z } from '@kbn/zod/v4';
export interface Validation<TLeft = unknown, TRight extends TLeft = TLeft> {
    is: (value: TLeft) => value is TRight;
    as: (value: TRight) => TRight;
    asserts: (value: TLeft) => asserts value is TRight;
    parse: (value: TLeft) => TRight;
    left: z.Schema<TLeft>;
    right: z.Schema<TRight>;
}
export declare function validation<TLeft, TRight extends TLeft>(left: z.Schema<TLeft>, right: z.Schema<TRight>): Validation<TLeft, TRight>;
