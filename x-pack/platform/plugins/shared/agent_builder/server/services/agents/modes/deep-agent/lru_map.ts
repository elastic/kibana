type Node<K, V> = {
    key: K;
    value: V;
    prev?: Node<K, V>;
    next?: Node<K, V>;
};

export class LRUMap<K, V> {
    private readonly map = new Map<K, Node<K, V>>();
    private head?: Node<K, V>; // most recently used
    private tail?: Node<K, V>; // least recently used

    constructor(private readonly capacity: number) {
        if (capacity <= 0) {
            throw new Error("LRUMap capacity must be > 0");
        }
    }

    get size(): number {
        return this.map.size;
    }

    /**
     * Gets all values in the LRUMap. Ordered by most recently used to least recently used.
     * @returns 
     */
    values(): V[] {
        const values = [];
        let current = this.head;
        while (current) {
            values.push(current.value);
            current = current.next;
        }
        return values;
    }

    get(key: K): V | undefined {
        const node = this.map.get(key);
        if (!node) return undefined;

        this.moveToHead(node);
        return node.value;
    }

    set(key: K, value: V): void {
        const existing = this.map.get(key);

        if (existing) {
            existing.value = value;
            this.moveToHead(existing);
            return;
        }

        const node: Node<K, V> = { key, value };
        this.map.set(key, node);
        this.addToHead(node);

        if (this.map.size > this.capacity) {
            this.evictLRU();
        }
    }

    has(key: K): boolean {
        return this.map.has(key);
    }

    delete(key: K): boolean {
        const node = this.map.get(key);
        if (!node) return false;

        this.removeNode(node);
        this.map.delete(key);
        return true;
    }

    clear(): void {
        this.map.clear();
        this.head = undefined;
        this.tail = undefined;
    }

    /* ---------- internals ---------- */

    private addToHead(node: Node<K, V>): void {
        node.prev = undefined;
        node.next = this.head;

        if (this.head) {
            this.head.prev = node;
        }
        this.head = node;

        if (!this.tail) {
            this.tail = node;
        }
    }

    private removeNode(node: Node<K, V>): void {
        if (node.prev) node.prev.next = node.next;
        if (node.next) node.next.prev = node.prev;

        if (node === this.head) this.head = node.next;
        if (node === this.tail) this.tail = node.prev;

        node.prev = undefined;
        node.next = undefined;
    }

    private moveToHead(node: Node<K, V>): void {
        if (node === this.head) return;
        this.removeNode(node);
        this.addToHead(node);
    }

    private evictLRU(): void {
        if (!this.tail) return;

        const lru = this.tail;
        this.removeNode(lru);
        this.map.delete(lru.key);
    }
}
