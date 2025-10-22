import React from 'react';
import { EdgeLabelRenderer, EdgeProps } from '@xyflow/react';
import { BaseEdge, getStraightPath } from '@xyflow/react';

export function CustomEdge({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    label,
    markerEnd
}: EdgeProps) {
    const [edgePath, labelX, labelY] = getStraightPath({
        sourceX,
        sourceY,
        targetX,
        targetY,
    });

    return (
        <>
            <BaseEdge
                id={id}
                path={edgePath}
                markerEnd={markerEnd}
            />
            <EdgeLabelRenderer>
                <div
                    style={{
                        position: 'absolute',
                        transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
                        pointerEvents: 'all',
                    }}
                    className="nodrag nopan"
                >{label}</div>
            </EdgeLabelRenderer>
        </>
    );
}