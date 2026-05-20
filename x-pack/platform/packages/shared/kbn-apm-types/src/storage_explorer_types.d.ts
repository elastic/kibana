import type * as t from 'io-ts';
import type { IndexLifecyclePhaseSelectOption } from './ilm_types';
export declare const indexLifecyclePhaseRt: t.TypeC<{
    indexLifecyclePhase: t.UnionC<[t.LiteralC<IndexLifecyclePhaseSelectOption.All>, t.LiteralC<IndexLifecyclePhaseSelectOption.Hot>, t.LiteralC<IndexLifecyclePhaseSelectOption.Warm>, t.LiteralC<IndexLifecyclePhaseSelectOption.Cold>, t.LiteralC<IndexLifecyclePhaseSelectOption.Frozen>]>;
}>;
