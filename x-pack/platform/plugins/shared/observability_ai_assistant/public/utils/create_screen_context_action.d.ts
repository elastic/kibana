import type { FromSchema } from 'json-schema-to-ts';
import type { CompatibleJSONSchema } from '../../common/functions/types';
import type { ScreenContextActionDefinition, ScreenContextActionRespondFunction } from '../../common/types';
type ReturnOf<TActionDefinition extends Omit<ScreenContextActionDefinition, 'respond'>> = TActionDefinition['parameters'] extends CompatibleJSONSchema ? FromSchema<TActionDefinition['parameters']> : undefined;
export declare function createScreenContextAction<TActionDefinition extends Omit<ScreenContextActionDefinition, 'respond'>, TRespondFunction extends ScreenContextActionRespondFunction<ReturnOf<TActionDefinition>>>(definition: TActionDefinition, respond: TRespondFunction): ScreenContextActionDefinition<ReturnOf<TActionDefinition>>;
export {};
