import React from 'react';
import type { RoutingDefinitionWithUIAttributes } from './types';
export declare function EditRoutingStreamEntry({ onChange, routingRule, }: {
    onChange: (child: Partial<RoutingDefinitionWithUIAttributes>) => void;
    routingRule: RoutingDefinitionWithUIAttributes;
}): React.JSX.Element;
