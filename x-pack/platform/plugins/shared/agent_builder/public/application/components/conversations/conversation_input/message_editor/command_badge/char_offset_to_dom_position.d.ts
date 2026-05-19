interface DomPosition {
    node: Node;
    offset: number;
}
/**
 * Converts a character offset within a container to a DOM node + offset pair.
 *
 * Walks the container's direct children, accumulating character lengths, to find
 * which child node contains the target offset. For text nodes, returns the
 * intra-node character position. For badge elements (which are atomic and
 * non-editable), returns a parent-relative position before the badge.
 */
export declare const charOffsetToDomPosition: (container: HTMLElement, charOffset: number) => DomPosition;
export {};
