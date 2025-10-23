import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { EuiFlexGroup, EuiIcon, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';

export interface StreamNodeData extends Record<string, unknown> {
    label: string;
    type: 'wired' | 'root' | 'classic';
    level: number;
    hasParent?: boolean;
    hasChildren?: boolean;
}

export const StreamNode = ({ data: { label, type, hasParent, hasChildren }}: { data: StreamNodeData }) => {
    const { euiTheme } = useEuiTheme();

    const nodeClass = css`
        background: ${euiTheme.colors.emptyShade};
        border: 1px solid ${euiTheme.colors.lightShade};
        border-radius: 6px;
        padding: ${euiTheme.size.m};
        font-size: ${euiTheme.font.scale.xs};
    `;

    return (
        <div
            className={nodeClass}
        >
            <Handle
                type="source"
                position={Position.Bottom}
                id="source"
                className={css`visibility: ${!hasChildren ? 'hidden' : ''};`}
            />
            <Handle
                type="target"
                position={Position.Top}
                id="target"
                className={css`visibility: ${!hasParent ? 'hidden' : ''};`}
            />
            <EuiFlexGroup alignItems="center" gutterSize='xs'>
                {type === 'root' && <EuiIcon type="aggregate" size="s" />}
                <EuiText size='xs'>
                    {label.length > 20 ? label.substring(0, 17) + '...' : label}
                </EuiText>
            </EuiFlexGroup>
        </div>
    );
};