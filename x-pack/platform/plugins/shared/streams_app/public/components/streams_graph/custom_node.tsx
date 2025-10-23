import React, { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { EuiFlexGroup, EuiIcon, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';
import { truncateText } from '../../util/truncate_text';
import { StreamNodePopover } from './stream_popup';
import type { EnrichedStream } from '../stream_list_view/utils';

export const STREAM_NODE_TYPE = 'streamNode';

export interface StreamNodeData extends Record<string, unknown> {
    label: string;
    type: 'wired' | 'root' | 'classic';
    hasChildren: boolean;
    stream: EnrichedStream;
}

export const StreamNode = ({ data: { label, type, hasChildren, stream } }: { data: StreamNodeData }) => {
    const { euiTheme } = useEuiTheme();
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);

    const nodeClass = css`
        background: ${euiTheme.colors.emptyShade};
        border: 1px solid ${euiTheme.colors.lightShade};
        border-radius: 6px;
        padding: ${euiTheme.size.m};
        font-size: ${euiTheme.font.scale.xs};
        cursor: pointer;
    `;

    const nodeContent = (
        <div
            className={nodeClass}
            onClick={() => setIsPopoverOpen((isPopupOpen) => !isPopupOpen)}
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
                className={css`visibility: ${type === 'root' ? 'hidden' : ''};`}
            />
            <EuiFlexGroup alignItems="center" gutterSize='xs'>
                {type === 'root' && <EuiIcon type="aggregate" size="s" />}
                <EuiText size='xs'>
                    {label.length > 20 ? truncateText(label, 17) : label}
                </EuiText>
                {hasChildren && <EuiIcon type="arrowDown" size="s" />}
            </EuiFlexGroup>
        </div>
    );

    return (
        <StreamNodePopover
            isOpen={isPopoverOpen}
            onClose={() => setIsPopoverOpen(false)}
            stream={stream}
            button={nodeContent}
        />
    );
}