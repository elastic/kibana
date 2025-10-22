import React from 'react';
import { Handle, Position } from '@xyflow/react';

export interface StreamNodeData extends Record<string, unknown> {
    label: string;
    type: 'wired' | 'root' | 'classic';
    level: number;
}

export const StreamNode = ({ data }: { data: StreamNodeData }) => {
    const getNodeColor = (type: string) => {
        switch (type) {
            case 'wired':
                return '#0079a5';
            case 'root':
                return '#00bfb3';
            case 'classic':
                return '#f5a700';
            default:
                return '#6b7280';
        }
    };

    return (
        <div
            style={{
                background: getNodeColor(data.type),
                color: 'white',
                padding: '10px',
                borderRadius: '8px',
                border: '2px solid #ffffff',
                minWidth: '150px',
                textAlign: 'center',
                fontSize: '12px',
                fontWeight: 'bold',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                position: 'relative',
            }}
        >
            {/* Source handle for outgoing edges */}
            <Handle
                type="source"
                position={Position.Bottom}
                id="source"
                style={{
                    background: '#0079a5',
                    width: 10,
                    height: 10,
                }}
            />

            {/* Target handle for incoming edges */}
            <Handle
                type="target"
                position={Position.Top}
                id="target"
                style={{
                    background: '#0079a5',
                    width: 10,
                    height: 10,
                }}
            />

            <div style={{ marginBottom: '4px' }}>
                {data.label.length > 20 ? data.label.substring(0, 17) + '...' : data.label}
            </div>
            <div style={{ fontSize: '10px', opacity: 0.9 }}>
                {data.type.toUpperCase()}
            </div>
        </div>
    );
};