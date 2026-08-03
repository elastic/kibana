/**
 * Ensures the structural `fields` block is present in the editor "blueprint" YAML, and normalizes
 * the top-level key order (case defaults in render-panel order, with custom `fields` appended last).
 * Run ONCE when seeding the initial editor value (not on every keystroke).
 *
 * Case defaults (name/description/severity/category/tags/assignees) are all optional and are NOT
 * seeded: an author adds only what their workflow needs, and the render panel shows sensible
 * fallbacks for anything left unset. The `connector` and `settings` blocks are likewise not seeded —
 * under the Fields/Configuration split they are panel-owned (edited on the Configuration tab, merged
 * into the saved definition on save), never part of the editor buffer. Template identity is never
 * written here either — it lives on the template's saved-object attributes.
 */
export declare const seedRequiredTemplateBlocks: (definitionYaml: string) => string;
