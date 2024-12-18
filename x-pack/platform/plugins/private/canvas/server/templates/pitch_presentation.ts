/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Path from 'path';

import { CanvasTemplate } from '../../types';

const ext = (name: string) => Path.extname(name);
const base64 = (name: string) => Fs.readFileSync(Path.resolve(__dirname, 'assets', name), 'base64');
const contentType = (name: string) => {
  switch (ext(name)) {
    case '.jpg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.svg':
      return 'image/svg+xml';
    default:
      throw new Error(`unknown content-type for extension [${ext(name)}]`);
  }
};
const embed = (name: string) => `data:${contentType(name)};base64,${base64(name)}`;

export const pitch: CanvasTemplate = {
  id: 'workpad-template-061d7868-2b4e-4dc8-8bf7-3772b52926e5',
  name: 'Pitch',
  help: 'Branded presentation with large photos',
  tags: ['presentation'],
  template_key: 'pitch-presentation',
  template: {
    name: 'Pitch',
    width: 1280,
    height: 720,
    page: 13,
    pages: [
      {
        id: 'page-b4742225-d480-4180-9345-4b9b7f30bf92',
        style: {
          background: '#FFF',
        },
        transition: {},
        elements: [
          {
            id: 'element-37a40bf5-ab26-4ff6-bb3a-9dcee66099c7',
            position: {
              left: -3,
              top: -163.25,
              width: 1285,
              height: 918,
              angle: 0,
              parent: null,
            },
            expression:
              'image dataurl={asset "asset-a30a06eb-2276-44b1-a62d-856e2116138c"} mode="cover"\n| render',
          },
          {
            id: 'element-6488fc45-2301-480c-bfb6-3a1fcbb6b457',
            position: {
              left: -3,
              top: -2,
              width: 1285,
              height: 724,
              angle: 0,
              parent: null,
            },
            expression:
              'shape "square" fill="#000000" border="rgba(255,255,255,0)" borderWidth=0 maintainAspect=false\n| render containerStyle={containerStyle opacity="0.7"}',
          },
          {
            id: 'element-508394a1-e1fd-41e1-87d3-9b8b51b22327',
            position: {
              left: 326,
              top: 232,
              width: 627,
              height: 161.5,
              angle: 0,
              parent: null,
            },
            expression:
              'kibana\n| selectFilter\n| demodata\n| markdown "# Sample."\n| render css=".canvasRenderEl h1 {\ntext-align: center;\n}"',
          },
          {
            id: 'element-33286979-7ea0-41ce-9835-b3bf07f09272',
            position: {
              left: 326,
              top: 393.5,
              width: 627,
              height: 43.25,
              angle: 0,
              parent: null,
            },
            expression:
              'kibana\n| selectFilter\n| demodata\n| markdown "### This is a subtitle"\n| render css=".canvasRenderEl h3 {\ntext-align: center;\n}"',
          },
          {
            id: 'element-1e3b3ffe-4ed8-4376-aad3-77e06d29cafe',
            position: {
              left: 326,
              top: 640.5,
              width: 627,
              height: 29.25,
              angle: 0,
              parent: null,
            },
            expression:
              'kibana\n| selectFilter\n| demodata\n| markdown "Footnote can go here"\n| render \n  css=".canvasRenderEl p {\ntext-align: center;\ncolor: #FFFFFF;\nfont-size: 18px;\nopacity: .7;\n}"',
          },
          {
            id: 'element-5b5035a3-d5b7-4483-a240-2cf80f5e0acf',
            position: {
              left: 594,
              top: 135,
              width: 91,
              height: 88,
              angle: 0,
              parent: null,
            },
            expression:
              'image dataurl={asset "asset-23edd689-2d34-4bb8-a3eb-05420dd87b85"} mode="contain"\n| render',
          },
        ],
        groups: [],
      },
      {
        id: 'page-52ce32af-3201-4f95-bcbb-5b8687edda36',
        style: {
          background: '#FFF',
        },
        transition: {},
        elements: [
          {
            id: 'element-6d4799a2-5a66-4e9b-8921-d18411537791',
            position: {
              left: 640.5,
              top: -2,
              width: 697,
              height: 821,
              angle: 0,
              parent: null,
            },
            expression:
              'image dataurl={asset "asset-048ed81e-84ae-4a48-9c30-641cf72b0376"} mode="cover"\n| render',
          },
          {
            id: 'element-5760459c-9e2e-4736-950d-ac5ed9b2b7ec',
            position: {
              left: 0,
              top: 57.5,
              width: 59.5,
              height: 25,
              angle: 0,
              parent: null,
            },
            expression:
              'shape "square" fill="#45bdb0" border="rgba(255,255,255,0)" borderWidth=0 maintainAspect=false\n| render',
          },
          {
            id: 'element-ebe793c9-90a0-4c29-9f5c-544a1c9637f6',
            position: {
              left: 72,
              top: 57.5,
              width: 199,
              height: 25,
              angle: 0,
              parent: null,
            },
            expression:
              'kibana\n| selectFilter\n| demodata\n| markdown "##### CATEGORY 01"\n| render',
          },
          {
            id: 'element-96a390b6-3d0a-4372-89cb-3ff38eec9565',
            position: {
              left: 72,
              top: 212,
              width: 340,
              height: 150,
              angle: 0,
              parent: null,
            },
            expression:
              'kibana\n| selectFilter\n| demodata\n| markdown "## Half text, half _image._"\n| render',
          },
          {
            id: 'element-118b848d-0f89-4d20-868c-21597b7fd5e0',
            position: {
              left: 72,
              top: 362,
              width: 59.5,
              height: 12.5,
              angle: 0,
              parent: null,
            },
            expression:
              'shape "square" fill="#444444" border="rgba(255,255,255,0)" borderWidth=0 maintainAspect=false\n| render',
          },
          {
            id: 'element-21837c83-194d-4ba6-aaff-a6247d58d2cf',
            position: {
              left: 73,
              top: 419,
              width: 340,
              height: 125,
              angle: 0,
              parent: null,
            },
            expression:
              'kibana\n| selectFilter\n| demodata\n| markdown \n  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Cras dapibus urna non feugiat imperdiet. Donec vel sollicitudin mauris, ut scelerisque urna. Sed vel neque quis metus vulputate luctus."\n| render',
          },
        ],
        groups: [],
      },
      {
        id: 'page-4ca7c323-87b0-4747-a7c8-18c3c8db0ffc',
        style: {
          background: '#FFF',
        },
        transition: {},
        elements: [
          {
            id: 'element-1ea05ce6-d1e6-4474-b3a8-1766318afb7c',
            position: {
              left: 0,
              top: 57.5,
              width: 59.5,
              height: 25,
              angle: 0,
              parent: null,
            },
            expression:
              'shape "square" fill="#45bdb0" border="rgba(255,255,255,0)" borderWidth=0 maintainAspect=false\n| render',
          },
          {
            id: 'element-3f1921e6-6856-461e-8b9a-ebf231693da6',
            position: {
              left: 72,
              top: 57.5,
              width: 199,
              height: 25,
              angle: 0,
              parent: null,
            },
            expression: 'kibana\n| selectFilter\n| demodata\n| markdown "##### BIOS"\n| render',
          },
          {
            id: 'element-e2c658ee-7614-4d92-a46e-2b1a81a24485',
            position: {
              left: 250,
              top: 405,
              width: 340,
              height: 75,
              angle: 0,
              parent: null,
            },
            expression:
              'kibana\n| selectFilter\n| demodata\n| markdown "## Jane Doe" \n  font={font family="\'Open Sans\', Helvetica, Arial, sans-serif" size=14 align="center" color="#000000" weight="normal" underline=false italic=false}\n| render',
          },
          {
            id: 'element-3d16765e-5251-4954-8e2a-6c64ed465b73',
            position: {
              left: 250,
              top: 480,
              width: 340,
              height: 75,
              angle: 0,
              parent: null,
            },
            expression:
              'kibana\n| selectFilter\n| demodata\n| markdown "### Developer" \n  font={font family="\'Open Sans\', Helvetica, Arial, sans-serif" size=14 align="center" color="#000000" weight="normal" underline=false italic=false}\n| render css=".canvasRenderEl h3 {\ncolor: #444444;\n}"',
          },
          {
            id: 'element-624675cf-46e9-4545-b86a-5409bbe53ac1',
            position: {
              left: 250,
              top: 555,
              width: 340,
              height: 81,
              angle: 0,
              parent: null,
            },
            expression:
              'kibana\n| selectFilter\n| demodata\n| markdown \n  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec vel sollicitudin mauris, ut scelerisque urna. " \n  font={font family="\'Open Sans\', Helvetica, Arial, sans-serif" size=14 align="center" color="#000000" weight="normal" underline=false italic=false}\n| render',
          },
          {
            id: 'element-dc841809-d2a9-491b-b44f-be92927b8034',
            position: {
              left: 595,
              top: 203,
              width: 91,
              height: 84,
              angle: 0,
              parent: null,
            },
            expression:
              'image dataurl={asset "asset-aa91a324-8012-477e-a7e4-7c3cd7a6332f"} mode="contain"\n| render',
          },
          {
            id: 'element-c2916246-26dd-4c65-91c6-d1ad3f1791ee',
            position: {
              left: 293,
              top: 119,
              width: 254,
              height: 252,
              angle: 0,
              parent: null,
            },
            expression:
              'image dataurl={asset "asset-0c6f377f-771e-432e-8e2e-15c3e9142ad6"} mode="contain"\n| render',
          },
          {
            id: 'element-bff7333e-9ee2-4416-bca7-9d931cbf54c5',
            position: {
              left: 697,
              top: 555,
              width: 340,
              height: 81,
              angle: 0,
              parent: null,
            },
            expression:
              'kibana\n| selectFilter\n| demodata\n| markdown \n  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec vel sollicitudin mauris, ut scelerisque urna. " \n  font={font family="\'Open Sans\', Helvetica, Arial, sans-serif" size=14 align="center" color="#000000" weight="normal" underline=false italic=false}\n| render',
          },
          {
            id: 'element-62f241ec-71ce-4edb-a27b-0de990522d20',
            position: {
              left: 697,
              top: 480,
              width: 340,
              height: 75,
              angle: 0,
              parent: null,
            },
            expression:
              'kibana\n| selectFilter\n| demodata\n| markdown "### Designer" \n  font={font family="\'Open Sans\', Helvetica, Arial, sans-serif" size=14 align="center" color="#000000" weight="normal" underline=false italic=false}\n| render css=".canvasRenderEl h3 {\ncolor: #444444;\n}"',
          },
          {
            id: 'element-aa6c07e0-937f-4362-9d52-f70738faa0c5',
            position: {
              left: 740,
              top: 119,
              width: 254,
              height: 252,
              angle: 0,
              parent: null,
            },
            expression:
              'image dataurl={asset "asset-9c2e5ab5-2dbe-43a8-bc84-e67f191fbcd8"} mode="contain"\n| render',
          },
          {
            id: 'element-c9df12ac-e08a-4229-b92c-c97bae81ec49',
            position: {
              left: 697,
              top: 405,
              width: 340,
              height: 75,
              angle: 0,
              parent: null,
            },
            expression:
              'kibana\n| selectFilter\n| demodata\n| markdown "## John Smith" \n  font={font family="\'Open Sans\', Helvetica, Arial, sans-serif" size=14 align="center" color="#000000" weight="normal" underline=false italic=false}\n| render',
          },
        ],
        groups: [],
      },
      {
        id: 'page-b031a6d5-e251-4653-8b89-7f356fc06ad2',
        style: {
          background: '#FFF',
        },
        transition: {},
        elements: [
          {
            id: 'element-1480853a-f7aa-4d57-8e61-8c0b10248c79',
            position: {
              left: 501.5,
              top: 134,
              width: 778,
              height: 226,
              angle: 0,
              parent: null,
            },
            expression:
              'image dataurl={asset "asset-6fb8f925-0e1e-4108-8442-3dbf88d145e5"} mode="cover"\n| render',
          },
          {
            id: 'element-aecd77dd-4691-40b0-ae65-6503a23bcf47',
            position: {
              left: 0,
              top: 57.5,
              width: 59.5,
              height: 25,
              angle: 0,
              parent: null,
            },
            expression:
              'shape "square" fill="#45bdb0" border="rgba(255,255,255,0)" borderWidth=0 maintainAspect=false\n| render',
          },
          {
            id: 'element-2d3eafaf-76df-45f2-ae6c-8c34821cc83a',
            position: {
              left: 72,
              top: 57.5,
              width: 199,
              height: 25,
              angle: 0,
              parent: null,
            },
            expression:
              'kibana\n| selectFilter\n| demodata\n| markdown "##### CATEGORY 10"\n| render',
          },
          {
            id: 'element-96be0724-0945-4802-8929-1dc456192fb5',
            position: {
              left: 73,
              top: 198,
              width: 273,
              height: 283.5,
              angle: 0,
              parent: null,
            },
            expression:
              'kibana\n| selectFilter\n| demodata\n| markdown "## Another page style."\n| render css=".canvasRenderEl h2 {\nfont-size: 64px;\n}"',
          },
          {
            id: 'element-3b4ba0ff-7f95-460e-9fa6-0cbb0f8f3df8',
            position: {
              left: 72,
              top: 499.5,
              width: 59.5,
              height: 12.5,
              angle: 0,
              parent: null,
            },
            expression:
              'shape "square" fill="#444444" border="rgba(255,255,255,0)" borderWidth=0 maintainAspect=false\n| render',
          },
          {
            id: 'element-2c0436af-1145-4c43-89e3-ec9b7d5becbc',
            position: {
              left: 543,
              top: 441.75,
              width: 467,
              height: 150,
              angle: 0,
              parent: null,
            },
            expression:
              'kibana\n| selectFilter\n| demodata\n| markdown \n  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Cras dapibus urna non feugiat imperdiet. Donec vel sollicitudin mauris, ut scelerisque urna. Sed vel neque quis metus vulputate luctus."\n| render',
          },
          {
            id: 'element-0b9aa82b-fb0c-4000-805b-146cc9280bc5',
            position: {
              left: 543,
              top: 388,
              width: 273,
              height: 47.5,
              angle: 0,
              parent: null,
            },
            expression:
              'kibana\n| selectFilter\n| demodata\n| markdown "### Introduction"\n| render css=".canvasRenderEl h3 {\ncolor: #444444;\n}"',
          },
        ],
        groups: [],
      },
      {
        id: 'page-662ed551-0c1d-44f0-a49b-9531f65848cc',
        style: {
          background: '#FFF',
        },
        transition: {},
        elements: [
          {
            id: 'element-88d04b96-43e2-4c99-bc8a-f3c8c4f4d5c4',
            position: {
              left: 0,
              top: -3,
              width: 1280,
              height: 329,
              angle: 0,
              parent: null,
            },
            expression:
              'image dataurl={asset "asset-d38c5025-eafc-4a35-a5fd-fb7b5bdc9efa"} mode="cover"\n| render',
          },
          {
            id: 'element-eb321f5a-bf16-449a-aa97-cba92f24ee52',
            position: {
              left: 0,
              top: 57.5,
              width: 59.5,
              height: 25,
              angle: 0,
              parent: null,
            },
            expression:
              'shape "square" fill="#45bdb0" border="rgba(255,255,255,0)" borderWidth=0 maintainAspect=false\n| render',
          },
          {
            id: 'element-74e699cd-48d2-44be-b08e-c7f144a2a6ae',
            position: {
              left: 72,
              top: 57.5,
              width: 199,
              height: 25,
              angle: 0,
              parent: null,
            },
            expression:
              'kibana\n| selectFilter\n| demodata\n| markdown "##### CATEGORY 01"\n| render css=".canvasRenderEl h5 {\ncolor: #45bdb0;\n}"',
          },
          {
            id: 'element-1ba728f0-f645-4910-9d32-fa5b5820a94c',
            position: {
              left: 109.5,
              top: 609.75,
              width: 301,
              height: 74,
              angle: 0,
              parent: null,
            },
            expression:
              'kibana\n| selectFilter\n| demodata\n| markdown \n  "Cras dapibus urna non feugiat imperdiet. Donec mauris, ut scelerisque urna. Sed vel neque quis metus luctus." \n  font={font family="\'Open Sans\', Helvetica, Arial, sans-serif" size=14 align="center" color="#000000" weight="normal" underline=false italic=false}\n| render',
          },
          {
            id: 'element-db9051eb-7699-4883-b67f-945979cf5650',
            position: {
              left: 410.5,
              top: 445,
              width: 79,
              height: 81,
              angle: 0,
              parent: null,
            },
            expression:
              'image dataurl={asset "asset-aa91a324-8012-477e-a7e4-7c3cd7a6332f"} mode="contain"\n| render',
          },
          {
            id: 'element-a3ed075b-58e7-4845-a761-0ad507419034',
            position: {
              left: 159.5,
              top: 387.5,
              width: 201,
              height: 196,
              angle: 0,
              parent: null,
            },
            expression:
              'kibana\n| selectFilter\n| demodata\n| math "mean(percent_uptime)"\n| progress shape="wheel" label={formatnumber "0%"} \n  font={font family="Futura, Impact, Helvetica, Arial, sans-serif" size=30 align="center" color="#45bdb0" weight="bold" underline=false italic=false} valueColor="#45bdb0" valueWeight=15 barColor="#444444" barWeight=15\n| render',
          },
          {
            id: 'element-fc11525c-2d9c-4a7b-9d96-d54e7bc6479b',
            position: {
              left: 790.5,
              top: 445,
              width: 79,
              height: 81,
              angle: 0,
              parent: null,
            },
            expression:
              'image dataurl={asset "asset-aa91a324-8012-477e-a7e4-7c3cd7a6332f"} mode="contain"\n| render',
          },
          {
            id: 'element-ad1ea62e-23c7-4209-8bd2-ef92147ec768',
            position: {
              left: 489.5,
              top: 609.75,
              width: 301,
              height: 74,
              angle: 0,
              parent: null,
            },
            expression:
              'kibana\n| selectFilter\n| demodata\n| markdown \n  "Cras dapibus urna non feugiat imperdiet. Donec mauris, ut scelerisque urna. Sed vel neque quis metus luctus." \n  font={font family="\'Open Sans\', Helvetica, Arial, sans-serif" size=14 align="center" color="#000000" weight="normal" underline=false italic=false}\n| render',
          },
          {
            id: 'element-eb9a8883-de47-4a46-9400-b7569f9e69e6',
            position: {
              left: 539.5,
              top: 387.5,
              width: 201,
              height: 196,
              angle: 0,
              parent: null,
            },
            expression:
              'kibana\n| selectFilter\n| demodata\n| math "mean(percent_uptime)"\n| progress shape="wheel" label={formatnumber "0%"} \n  font={font family="Futura, Impact, Helvetica, Arial, sans-serif" size=30 align="center" color="#45bdb0" weight="bold" underline=false italic=false} valueColor="#45bdb0" valueWeight=15 barColor="#444444" barWeight=15\n| render',
          },
          {
            id: 'element-20c1c86a-658b-4bd2-8326-f987ef84e730',
            position: {
              left: 869.5,
              top: 609.75,
              width: 301,
              height: 74,
              angle: 0,
              parent: null,
            },
            expression:
              'kibana\n| selectFilter\n| demodata\n| markdown \n  "Cras dapibus urna non feugiat imperdiet. Donec mauris, ut scelerisque urna. Sed vel neque quis metus luctus." \n  font={font family="\'Open Sans\', Helvetica, Arial, sans-serif" size=14 align="center" color="#000000" weight="normal" underline=false italic=false}\n| render',
          },
          {
            id: 'element-335db0c3-f678-4cb8-8b93-a6494f1787f5',
            position: {
              left: 919.5,
              top: 387.5,
              width: 201,
              height: 196,
              angle: 0,
              parent: null,
            },
            expression:
              'kibana\n| selectFilter\n| demodata\n| math "mean(percent_uptime)"\n| progress shape="wheel" label={formatnumber "0%"} \n  font={font family="Futura, Impact, Helvetica, Arial, sans-serif" size=30 align="center" color="#45bdb0" weight="bold" underline=false italic=false} valueColor="#45bdb0" valueWeight=15 barColor="#444444" barWeight=15\n| render',
          },
          {
            id: 'element-079d3cbf-8b15-4ce2-accb-6ba04481019d',
            position: {
              left: 66.5,
              top: 461,
              width: 43,
              height: 49,
              angle: 0,
              parent: null,
            },
            expression:
              'image dataurl={asset "asset-b22b6fa7-618c-4a59-82a1-ca921454da48"} mode="contain"\n| render',
          },
          {
            id: 'element-d18d9d87-c685-4620-8e8f-9cd7f9b66cab',
            position: {
              left: 1174.5,
              top: 461,
              width: 43,
              height: 49,
              angle: 0,
              parent: null,
            },
            expression:
              'image dataurl={asset "asset-b22b6fa7-618c-4a59-82a1-ca921454da48"} mode="contain"\n| render',
          },
        ],
        groups: [],
      },
      {
        id: 'page-f6e4f8e7-dd66-4b1e-8200-0906d7c4a3b4',
        style: {
          background: '#FFF',
        },
        transition: {},
        elements: [
          {
            id: 'element-98af6c83-34cb-47ef-9d0c-d79bd8ad3b1b',
            position: {
              left: 683.5,
              top: 57.5,
              width: 608,
              height: 284,
              angle: 0,
              parent: null,
            },
            expression:
              'image dataurl={asset "asset-7f2d5d96-3c85-49a0-94f3-e9b05de23cb6"} mode="cover"\n| render',
          },
          {
            id: 'element-c70e5cf6-0a67-4098-9e8e-e976305caabf',
            position: {
              left: 0,
              top: 57.5,
              width: 59.5,
              height: 25,
              angle: 0,
              parent: null,
            },
            expression:
              'shape "square" fill="#45bdb0" border="rgba(255,255,255,0)" borderWidth=0 maintainAspect=false\n| render',
          },
          {
            id: 'element-b489109b-090b-4fd5-b9c4-df1a943a2c96',
            position: {
              left: 72,
              top: 57.5,
              width: 199,
              height: 25,
              angle: 0,
              parent: null,
            },
            expression:
              'kibana\n| selectFilter\n| demodata\n| markdown "##### CATEGORY 01"\n| render',
          },
          {
            id: 'element-0f2b9268-f0bd-41b7-abc8-5593276f26fa',
            position: {
              left: 72,
              top: 212,
              width: 371,
              height: 150,
              angle: 0,
              parent: null,
            },
            expression:
              'kibana\n| selectFilter\n| demodata\n| markdown "## Bold title text goes _here_."\n| render',
          },
          {
            id: 'element-4f4b503e-f1ef-4ab7-aa1d-5d95b3e2e605',
            position: {
              left: 72,
              top: 362,
              width: 59.5,
              height: 12.5,
              angle: 0,
              parent: null,
            },
            expression:
              'shape "square" fill="#444444" border="rgba(255,255,255,0)" borderWidth=0 maintainAspect=false\n| render',
          },
          {
            id: 'element-ab6dd5dd-c121-4d8d-9f8f-1403a6ce894e',
            position: {
              left: 73,
              top: 419,
              width: 340,
              height: 125,
              angle: 0,
              parent: null,
            },
            expression:
              'kibana\n| selectFilter\n| demodata\n| markdown \n  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Cras dapibus urna non feugiat imperdiet. Donec vel sollicitudin mauris, ut scelerisque urna. Sed vel neque quis metus vulputate luctus."\n| render',
          },
          {
            id: 'element-f3f28541-06fe-47ea-89b7-1c5831e28e71',
            position: {
              left: 887,
              top: 359.875,
              width: 366,
              height: 29.25,
              angle: 0,
              parent: null,
            },
            expression:
              'kibana\n| selectFilter\n| demodata\n| markdown "Caption text goes here" \n  font={font family="\'Open Sans\', Helvetica, Arial, sans-serif" size=14 align="right" color="#000000" weight="normal" underline=false italic=false}\n| render css=".canvasRenderEl p {\nfont-size: 18px;\nopacity: .8;\n}"',
          },
        ],
        groups: [],
      },
      {
        id: 'page-7383c0a8-935a-4848-83f0-e92b00628398',
        style: {
          background: '#FFF',
        },
        transition: {},
        elements: [
          {
            id: 'element-fb6f9887-6a89-4ece-8b1e-aca5ba81e0db',
            position: {
              left: -1,
              top: -2,
              width: 379,
              height: 723,
              angle: 0,
              parent: null,
            },
            expression:
              'image dataurl={asset "asset-048ed81e-84ae-4a48-9c30-641cf72b0376"} mode="cover"\n| render',
          },
          {
            id: 'element-3c122a5d-a45a-493a-a20d-59991b6c8429',
            position: {
              left: 0,
              top: 57.5,
              width: 59.5,
              height: 25,
              angle: 0,
              parent: null,
            },
            expression:
              'shape "square" fill="#45bdb0" border="rgba(255,255,255,0)" borderWidth=0 maintainAspect=false\n| render',
          },
          {
            id: 'element-81d71504-ed94-42a1-aaee-3e62ee196cf3',
            position: {
              left: 72,
              top: 57.5,
              width: 199,
              height: 25,
              angle: 0,
              parent: null,
            },
            expression:
              'kibana\n| selectFilter\n| demodata\n| markdown "##### CATEGORY 01"\n| render css=".canvasRenderEl h5 {\ncolor: #45bdb0;\n}"',
          },
          {
            id: 'element-5afa7019-af44-4919-9e11-24e2348cfae9',
            position: {
              left: 73,
              top: 240,
              width: 240,
              height: 207,
              angle: 0,
              parent: null,
            },
            expression:
              'kibana\n| selectFilter\n| demodata\n| markdown "## Title for live charts."\n| render css=".canvasRenderEl h2 {\ncolor: #FFFFFF;\n}"',
          },
          {
            id: 'element-7b856b52-0d8b-492b-a71f-3508a84388a6',
            position: {
              left: 73,
              top: 452.75,
              width: 59.5,
              height: 12.5,
              angle: 0,
              parent: null,
            },
            expression:
              'shape "square" fill="#45bdb0" border="rgba(255,255,255,0)" borderWidth=0 maintainAspect=false\n| render',
          },
          {
            id: 'element-ebc24b6b-8652-4ff9-bedf-5f7ce3d96cdf',
            position: {
              left: 74,
              top: 554,
              width: 65,
              height: 67,
              angle: 0,
              parent: null,
            },
            expression:
              'image dataurl={asset "asset-23edd689-2d34-4bb8-a3eb-05420dd87b85"} mode="contain"\n| render',
          },
          {
            id: 'element-efd21158-c08b-4621-b2ef-0ded34ba5230',
            position: {
              left: 487,
              top: 57.5,
              width: 645,
              height: 81,
              angle: 0,
              parent: null,
            },
            expression:
              'kibana\n| selectFilter\n| demodata\n| markdown "## _Charts with live data._"\n| render css=".canvasRenderEl h1 {\n\n}"',
          },
          {
            id: 'element-317bed0b-f067-4d2d-8cb4-1145f6e0a11c',
            position: {
              left: 487,
              top: 191.75,
              width: 531,
              height: 34,
              angle: 0,
              parent: null,
            },
            expression:
              'kibana\n| selectFilter\n| demodata\n| math "mean(percent_uptime)"\n| progress shape="horizontalBar" label={formatnumber "0%"} \n  font={font family="Futura, Impact, Helvetica, Arial, sans-serif" size=18 align="center" color="#444444" weight="bold" underline=false italic=false} valueColor="#45bdb0" valueWeight=15 barColor="#444444" barWeight=15\n| render css=".canvasRenderEl {\nwidth: 100%;\n}"',
          },
          {
            id: 'element-34385617-6eb7-4918-b4db-1a0e8dd6eabe',
            position: {
              left: 487,
              top: 258.75,
              width: 531,
              height: 34,
              angle: 0,
              parent: null,
            },
            expression:
              'kibana\n| selectFilter\n| demodata\n| math "mean(percent_uptime)"\n| progress shape="horizontalBar" label={formatnumber "0%"} \n  font={font family="Futura, Impact, Helvetica, Arial, sans-serif" size=18 align="center" color="#444444" weight="bold" underline=false italic=false} valueColor="#45bdb0" valueWeight=15 barColor="#444444" barWeight=15\n| render css=".canvasRenderEl {\nwidth: 100%;\n}"',
          },
          {
            id: 'element-b22a35eb-b177-4664-800e-57b91436a879',
            position: {
              left: 487,
              top: 322.25,
              width: 531,
              height: 34,
              angle: 0,
              parent: null,
            },
            expression:
              'kibana\n| selectFilter\n| demodata\n| math "mean(percent_uptime)"\n| progress shape="horizontalBar" label={formatnumber "0%"} \n  font={font family="Futura, Impact, Helvetica, Arial, sans-serif" size=18 align="center" color="#444444" weight="bold" underline=false italic=false} valueColor="#45bdb0" valueWeight=15 barColor="#444444" barWeight=15\n| render css=".canvasRenderEl {\nwidth: 100%;\n}"',
          },
          {
            id: 'element-651f8a4a-6069-49bf-a7b0-484854628a79',
            position: {
              left: 487,
              top: 386.25,
              width: 531,
              height: 34,
              angle: 0,
              parent: null,
            },
            expression:
              'kibana\n| selectFilter\n| demodata\n| math "mean(percent_uptime)"\n| progress shape="horizontalBar" label={formatnumber "0%"} \n  font={font family="Futura, Impact, Helvetica, Arial, sans-serif" size=18 align="center" color="#444444" weight="bold" underline=false italic=false} valueColor="#45bdb0" valueWeight=15 barColor="#444444" barWeight=15\n| render css=".canvasRenderEl {\nwidth: 100%;\n}"',
          },
          {
            id: 'element-0ee8c529-4155-442f-8c7c-1df86be37051',
            position: {
              left: 487,
              top: 491.5,
              width: 340,
              height: 125,
              angle: 0,
              parent: null,
            },
            expression:
              'kibana\n| selectFilter\n| demodata\n| markdown \n  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Cras dapibus urna non feugiat imperdiet. Donec vel sollicitudin mauris, ut scelerisque urna. Sed vel neque quis metus vulputate luctus."\n| render',
          },
          {
            id: 'element-3fb61301-3dc2-411f-ac69-ad22bd37c77d',
            position: {
              left: 864,
              top: 490.5,
              width: 340,
              height: 125,
              angle: 0,
              parent: null,
            },
            expression:
              'kibana\n| selectFilter\n| demodata\n| markdown \n  "Cras dapibus urna non feugiat imperdiet. \n\nDonec vel sollicitudin mauris, ut scelerisque urna. Sed vel neque quis metus vulputate luctus."\n| render',
          },
        ],
        groups: [],
      },
      {
        id: 'page-38816de0-d093-43e9-b40d-4e06d97af25c',
        style: {
          background: '#FFF',
        },
        transition: {},
        elements: [
          {
            id: 'element-b5f494a8-c4c3-4225-9a45-14eb3aac4e7a',
            position: {
              left: 512.5,
              top: -2,
              width: 893,
              height: 821,
              angle: 0,
              parent: null,
            },
            expression:
              'image dataurl={asset "asset-0791ed56-9a2e-4d0d-8d2d-a2f8c3c268ee"} mode="cover"\n| render',
          },
          {
            id: 'element-cd370318-0811-4fa9-a67d-2cf268ef09d5',
            position: {
              left: -8,
              top: -2,
              width: 533,
              height: 724,
              angle: 0,
              parent: null,
            },
            expression:
              'shape "square" fill="#222222" border="rgba(255,255,255,0)" borderWidth=0 maintainAspect=false\n| render',
          },
          {
            id: 'element-e22f98c0-b93d-4643-9008-fb6221575207',
            position: {
              left: 0,
              top: 57.5,
              width: 59.5,
              height: 25,
              angle: 0,
              parent: null,
            },
            expression:
              'shape "square" fill="#45bdb0" border="rgba(255,255,255,0)" borderWidth=0 maintainAspect=false\n| render',
          },
          {
            id: 'element-fbdc6414-8d61-4a0d-a838-5006345ba11d',
            position: {
              left: 72,
              top: 57.5,
              width: 199,
              height: 25,
              angle: 0,
              parent: null,
            },
            expression:
              'kibana\n| selectFilter\n| demodata\n| markdown "##### CATEGORY 01"\n| render css=".canvasRenderEl h5 {\ncolor: #45bdb0;\n}"',
          },
          {
            id: 'element-8b9d3e2b-1d7b-48f4-897c-bf48f0f363d4',
            position: {
              left: 73,
              top: 211,
              width: 388,
              height: 151,
              angle: 0,
              parent: null,
            },
            expression:
              'kibana\n| selectFilter\n| demodata\n| markdown "## Title on a _dark_ background."\n| render css=".canvasRenderEl h2 {\ncolor: #FFFFFF;\n}"',
          },
          {
            id: 'element-080c3153-45f7-4efc-8b23-ed7735da426f',
            position: {
              left: 72,
              top: 362,
              width: 59.5,
              height: 12.5,
              angle: 0,
              parent: null,
            },
            expression:
              'shape "square" fill="#FFFFFF" border="rgba(255,255,255,0)" borderWidth=0 maintainAspect=false\n| render',
          },
          {
            id: 'element-5cfc7e93-c082-41dc-bdd0-d634972e6356',
            position: {
              left: 73,
              top: 419,
              width: 340,
              height: 125,
              angle: 0,
              parent: null,
            },
            expression:
              'kibana\n| selectFilter\n| demodata\n| markdown \n  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Cras dapibus urna non feugiat imperdiet. Donec vel sollicitudin mauris, ut scelerisque urna. Sed vel neque quis metus vulputate luctus."\n| render css=".canvasRenderEl p {\ncolor: #FFFFFF;\nopacity: .8;\n}"',
          },
        ],
        groups: [],
      },
      {
        id: 'page-9ca5730c-e863-4c8f-8916-79ee8bbf9f4d',
        style: {
          background: '#FFF',
        },
        transition: {},
        elements: [
          {
            id: 'element-b4b1de4b-f2dd-482a-98ab-043898cbcba4',
            position: {
              left: 71,
              top: 51,
              width: 1035,
              height: 75,
              angle: 0,
              parent: null,
            },
            expression:
              'kibana\n| selectFilter\n| demodata\n| markdown "## Bullet point layout style"\n| render',
          },
          {
            id: 'element-37dc903a-1c6d-4452-8fc0-38d4afa4631a',
            position: {
              left: 75,
              top: 215,
              width: 1033,
              height: 311,
              angle: 0,
              parent: null,
            },
            expression:
              'kibana\n| selectFilter\n| demodata\n| markdown \n  "- Dolor sit amet, consectetur adipiscing elit\n- Cras dapibus urna non feugiat imperdiet\n- Donec vel sollicitudin mauris, ut scelerisque urna\n- Sed vel neque quis metus vulputate luctus\n- Dolor sit amet, consectetur adipiscing elit\n- Cras dapibus urna non feugiat imperdiet\n- Donec vel sollicitudin mauris, ut scelerisque urna\n- Sed vel neque quis metus vulputate luctus"\n| render css=".canvasRenderEl li {\nfont-size: 24px;\nline-height: 30px;\n}"',
          },
          {
            id: 'element-e506de9d-bda1-4018-89bf-f8d02ee5738e',
            position: {
              left: 73,
              top: 619.875,
              width: 426,
              height: 59.25,
              angle: 0,
              parent: null,
            },
            expression:
              'kibana\n| selectFilter\n| demodata\n| markdown \n  "Donec vel sollicitudin mauris, ut scelerisque urna. Vel sollicitudin mauris, ut scelerisque urna." \n  font={font family="\'Open Sans\', Helvetica, Arial, sans-serif" size=14 align="left" color="#000000" weight="normal" underline=false italic=true}\n| render css=".canvasRenderEl p {\nfont-size: 18px;\nopacity: .8;\n}"',
          },
          {
            id: 'element-ea5319f5-d204-48c5-a9a0-0724676869a6',
            position: {
              left: 1131,
              top: 51,
              width: 80,
              height: 75,
              angle: 0,
              parent: null,
            },
            expression:
              'image dataurl={asset "asset-aa91a324-8012-477e-a7e4-7c3cd7a6332f"} mode="contain"\n| render',
          },
          {
            id: 'element-8f2aecbd-9083-4539-be66-58906727523d',
            position: {
              left: 73,
              top: 120,
              width: 1035,
              height: 49,
              angle: 0,
              parent: null,
            },
            expression:
              'kibana\n| selectFilter\n| demodata\n| markdown "### Subtitle goes here"\n| render css=".canvasRenderEl h3 {\ncolor: #45bdb0;\ntext-transform: none;\n}"',
          },
        ],
        groups: [],
      },
      {
        id: 'page-00a81b50-27a9-47c0-9a54-ab57525cdff5',
        style: {
          background: '#FFF',
        },
        transition: {},
        elements: [
          {
            id: 'element-57b375e9-887e-45f3-b75d-7f1b8a3a41c3',
            position: {
              left: 71,
              top: 51,
              width: 1035,
              height: 75,
              angle: 0,
              parent: null,
            },
            expression:
              'kibana\n| selectFilter\n| demodata\n| markdown "## Paragraph layout style"\n| render',
          },
          {
            id: 'element-92b05ab1-c504-4110-a8ad-73d547136024',
            position: {
              left: 73,
              top: 231,
              width: 1033,
              height: 412,
              angle: 0,
              parent: null,
            },
            expression:
              'kibana\n| selectFilter\n| demodata\n| markdown \n  "Proin ipsum orci, consectetur a lacus vel, varius rutrum neque. Mauris quis gravida tellus. Integer quis tellus non lectus vestibulum fermentum. Quisque tortor justo, vulputate quis mollis eu, molestie eu ex. Nam eu arcu ac dui mattis facilisis aliquam venenatis est. Quisque tempor risus quis arcu viverra, quis consequat dolor molestie. Sed sed arcu dictum, sollicitudin dui id, iaculis elit. Nunc odio ex, placerat sed hendrerit vitae, finibus eu felis. Sed vulputate mi diam, at dictum mi tempus eu.\n\nClass aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Vivamus malesuada tortor vel eleifend lobortis. Donec vestibulum neque vel neque vehicula auctor. Proin id felis a leo ultrices maximus."\n| render css=".canvasRenderEl p {\nfont-size: 24px;\n}"',
          },
          {
            id: 'element-e49141ec-3034-4bec-88ca-f9606d12a60a',
            position: {
              left: 1131,
              top: 51,
              width: 80,
              height: 75,
              angle: 0,
              parent: null,
            },
            expression:
              'image dataurl={asset "asset-aa91a324-8012-477e-a7e4-7c3cd7a6332f"} mode="contain"\n| render',
          },
          {
            id: 'element-2f44bb9b-8f64-4ffd-bb3c-0ab1738f2300',
            position: {
              left: 73,
              top: 120,
              width: 1035,
              height: 49,
              angle: 0,
              parent: null,
            },
            expression:
              'kibana\n| selectFilter\n| demodata\n| markdown "### Subtitle goes here"\n| render css=".canvasRenderEl h3 {\ncolor: #45bdb0;\ntext-transform: none;\n}"',
          },
        ],
        groups: [],
      },
      {
        id: 'page-09231387-8f78-4439-94ad-0bb53562dc09',
        style: {
          background: '#FFF',
        },
        transition: {},
        elements: [
          {
            id: 'element-7ae52d84-0709-4689-930b-1596e6438d30',
            position: {
              left: -8,
              top: -2,
              width: 644,
              height: 724,
              angle: 0,
              parent: null,
            },
            expression:
              'shape "square" fill="#45bdb0" border="rgba(255,255,255,0)" borderWidth=0 maintainAspect=false\n| render',
          },
          {
            id: 'element-53068b8d-3484-43a0-8796-da92a355081d',
            position: {
              left: 120,
              top: 130,
              width: 403.5,
              height: 212,
              angle: 0,
              parent: null,
            },
            expression:
              'kibana\n| selectFilter\n| demodata\n| markdown "## Title text can also go _here_ on multiple lines." \n  font={font family="\'Open Sans\', Helvetica, Arial, sans-serif" size=14 align="center" color="#000000" weight="normal" underline=false italic=false}\n| render css=".canvasRenderEl h2 {\ncolor: #FFFFFF;\n}"',
          },
          {
            id: 'element-a8e0d4b3-864d-4dae-b0dc-64caad06c106',
            position: {
              left: 293,
              top: 360,
              width: 59.5,
              height: 12.5,
              angle: 0,
              parent: null,
            },
            expression:
              'shape "square" fill="#FFFFFF" border="rgba(255,255,255,0)" borderWidth=0 maintainAspect=false\n| render',
          },
          {
            id: 'element-82b09b95-c4f7-4d13-9926-c927608b544b',
            position: {
              left: 112.25,
              top: 446,
              width: 419,
              height: 156,
              angle: 0,
              parent: null,
            },
            expression:
              'kibana\n| selectFilter\n| demodata\n| markdown \n  "Vivamus malesuada tortor vel eleifend lobortis. Donec vestibulum neque vel neque vehicula auctor. Proin id felis a leo ultrices maximus. Nam est nulla, venenatis at mi et, sodales convallis eros. Aliquam a convallis justo, eu viverra augue. Donec mollis ipsum sed orci posuere, vel posuere neque tempus." \n  font={font family="\'Open Sans\', Helvetica, Arial, sans-serif" size=14 align="center" color="#000000" weight="normal" underline=false italic=false}\n| render css=".canvasRenderEl p {\ncolor: #FFFFFF;\nopacity: .8;\n}"',
          },
          {
            id: 'element-b54e2908-6908-4dd6-90f1-3ca489807016',
            position: {
              left: 636,
              top: -2,
              width: 644,
              height: 724,
              angle: 0,
              parent: null,
            },
            expression:
              'shape "square" fill="#222222" border="rgba(255,255,255,0)" borderWidth=0 maintainAspect=false\n| render',
          },
          {
            id: 'element-9d7e93ca-12ae-4ad8-9fc4-3bfb12c3eb99',
            position: {
              left: 756.25,
              top: 446,
              width: 419,
              height: 156,
              angle: 0,
              parent: null,
            },
            expression:
              'kibana\n| selectFilter\n| demodata\n| markdown \n  "Vivamus malesuada tortor vel eleifend lobortis. Donec vestibulum neque vel neque vehicula auctor. Proin id felis a leo ultrices maximus. Nam est nulla, venenatis at mi et, sodales convallis eros. Aliquam a convallis justo, eu viverra augue. Donec mollis ipsum sed orci posuere, vel posuere neque tempus." \n  font={font family="\'Open Sans\', Helvetica, Arial, sans-serif" size=14 align="center" color="#000000" weight="normal" underline=false italic=false}\n| render css=".canvasRenderEl p {\ncolor: #FFFFFF;\nopacity: .8;\n}"',
          },
          {
            id: 'element-aa54f47c-fecf-4bdb-ac1d-b815d4a8d71d',
            position: {
              left: 776.5,
              top: 130,
              width: 380.5,
              height: 212,
              angle: 0,
              parent: null,
            },
            expression:
              'kibana\n| selectFilter\n| demodata\n| markdown "## This title is a _centered_  layout." \n  font={font family="\'Open Sans\', Helvetica, Arial, sans-serif" size=14 align="center" color="#000000" weight="normal" underline=false italic=false}\n| render css=".canvasRenderEl h2 {\ncolor: #FFFFFF;\n}"',
          },
          {
            id: 'element-6ae072e7-213c-4de9-af22-7fb3e254cf52',
            position: {
              left: 937,
              top: 360,
              width: 59.5,
              height: 12.5,
              angle: 0,
              parent: null,
            },
            expression:
              'shape "square" fill="#FFFFFF" border="rgba(255,255,255,0)" borderWidth=0 maintainAspect=false\n| render',
          },
          {
            id: 'element-7d096263-cb5a-403f-9141-99b865d81e7f',
            position: {
              left: 599.5,
              top: 332.125,
              width: 73,
              height: 68.25,
              angle: 0,
              parent: null,
            },
            expression:
              'image dataurl={asset "asset-23edd689-2d34-4bb8-a3eb-05420dd87b85"} mode="contain"\n| render',
          },
        ],
        groups: [],
      },
      {
        id: 'page-639d37b0-66a9-420b-b9fc-da18ce50bd67',
        style: {
          background: '#FFF',
        },
        transition: {},
        elements: [
          {
            id: 'element-fdde8e78-ebbd-4425-8e70-dc951a065bb1',
            position: {
              left: 122.5,
              top: 221,
              width: 1035,
              height: 259,
              angle: 0,
              parent: null,
            },
            expression:
              'kibana\n| selectFilter\n| demodata\n| markdown \n  "## \\"Aliquam mollis auctor nisl vitae varius. Donec nunc turpis, condimentum non sagittis tristique, sollicitudin blandit sem.\\"" \n  font={font family="\'Open Sans\', Helvetica, Arial, sans-serif" size=14 align="center" color="#000000" weight="normal" underline=false italic=true}\n| render',
          },
          {
            id: 'element-989daff8-3571-4e02-b5fc-26657b2d9aaf',
            position: {
              left: 600,
              top: 84,
              width: 80,
              height: 75,
              angle: 0,
              parent: null,
            },
            expression:
              'image dataurl={asset "asset-aa91a324-8012-477e-a7e4-7c3cd7a6332f"} mode="contain"\n| render',
          },
          {
            id: 'element-97508535-99ab-4822-8ee3-f76c483e0d59',
            position: {
              left: 253.5,
              top: 556.5,
              width: 773,
              height: 49,
              angle: 0,
              parent: null,
            },
            expression:
              'kibana\n| selectFilter\n| demodata\n| markdown "### Lorem Ipsum" \n  font={font family="\'Open Sans\', Helvetica, Arial, sans-serif" size=14 align="center" color="#000000" weight="normal" underline=false italic=false}\n| render css=".canvasRenderEl h3 {\ncolor: #45bdb0;\ntext-transform: none;\n}"',
          },
          {
            id: 'element-cf931bd0-e3b6-4ae3-9164-8fe9ba14873d',
            position: {
              left: 610.25,
              top: 449,
              width: 59.5,
              height: 12.5,
              angle: 0,
              parent: null,
            },
            expression:
              'shape "square" fill="#444444" border="rgba(255,255,255,0)" borderWidth=0 maintainAspect=false\n| render',
          },
        ],
        groups: [],
      },
      {
        id: 'page-d0941db8-1103-49be-975f-937f7cf471c1',
        style: {
          background: '#FFF',
        },
        transition: {},
        elements: [
          {
            id: 'element-4c8ae02e-a9db-4bf1-aa4f-81e105d1f59f',
            position: {
              left: -8,
              top: -2,
              width: 1291,
              height: 724,
              angle: 0,
              parent: null,
            },
            expression:
              'shape "square" fill="#222222" border="rgba(255,255,255,0)" borderWidth=0 maintainAspect=false\n| render',
          },
          {
            id: 'element-652f3c55-5a31-4c9e-856a-ce1607ab94dd',
            position: {
              left: 0,
              top: 57.5,
              width: 59.5,
              height: 25,
              angle: 0,
              parent: null,
            },
            expression:
              'shape "square" fill="#45bdb0" border="rgba(255,255,255,0)" borderWidth=0 maintainAspect=false\n| render',
          },
          {
            id: 'element-d6a09a51-5fc6-4576-bde1-aee49a726a4d',
            position: {
              left: 72,
              top: 57.5,
              width: 199,
              height: 25,
              angle: 0,
              parent: null,
            },
            expression:
              'kibana\n| selectFilter\n| demodata\n| markdown "##### CATEGORY 01"\n| render css=".canvasRenderEl h5 {\ncolor: #FFFFFF;\n}"',
          },
          {
            id: 'element-dc4336d5-9752-421f-8196-9f4a6f8150f0',
            position: {
              left: 503,
              top: 378,
              width: 270,
              height: 125,
              angle: 0,
              parent: 'group-1303d0b2-057a-40bf-a0ff-4907b00a285c',
            },
            expression:
              'kibana\n| selectFilter\n| demodata\n| markdown \n  "Donec vel sollicitudin mauris, ut scelerisque urna. Sed vel neque quis metus vulputate luctus." \n  font={font family="\'Open Sans\', Helvetica, Arial, sans-serif" size=18 align="center" color="#000000" weight="normal" underline=false italic=false}\n| render css=".canvasRenderEl p {\ncolor: #FFFFFF;\nopacity: .8;\nfont-size: 18px;\n}"',
          },
          {
            id: 'element-b8325cb3-2856-4fd6-8c5a-cba2430dda3e',
            position: {
              left: 597,
              top: 57.5,
              width: 80,
              height: 75,
              angle: 0,
              parent: null,
            },
            expression:
              'image dataurl={asset "asset-aa91a324-8012-477e-a7e4-7c3cd7a6332f"} mode="contain"\n| render',
          },
          {
            id: 'element-5b6914d8-cec5-488e-92a7-fed3e94f4e59',
            position: {
              left: 906,
              top: 236,
              width: 200,
              height: 133,
              angle: 0,
              parent: 'group-1303d0b2-057a-40bf-a0ff-4907b00a285c',
            },
            expression:
              'kibana\n| selectFilter\n| demodata\n| math "unique(project)"\n| metric "Projects" \n  metricFont={font family="Futura, Impact, Helvetica, Arial, sans-serif" size=72 align="center" color="#45bdb0" weight="bold" underline=false italic=false} \n  labelFont={font family="Futura, Impact, Helvetica, Arial, sans-serif" size=24 align="center" color="#45bdb0" weight="normal" underline=false italic=false}\n| render css=".canvasRenderEl .canvasMetric__metric {\nmargin-bottom: 32px;\n}"',
          },
          {
            id: 'element-07f73884-13e9-4a75-8a23-4eb137e75817',
            position: {
              left: 424,
              top: 629.875,
              width: 426,
              height: 59.25,
              angle: 0,
              parent: null,
            },
            expression:
              'kibana\n| selectFilter\n| demodata\n| markdown \n  "Donec vel sollicitudin mauris, ut scelerisque urna. Vel sollicitudin mauris, ut scelerisque urna." \n  font={font family="\'Open Sans\', Helvetica, Arial, sans-serif" size=14 align="center" color="#FFFFFF" weight="normal" underline=false italic=true}\n| render css=".canvasRenderEl p {\nfont-size: 16px;\nopacity: .7;\n}"',
          },
          {
            id: 'element-201b8f78-045e-4457-9ada-5166965e64cf',
            position: {
              left: 871,
              top: 378,
              width: 270,
              height: 125,
              angle: 0,
              parent: 'group-1303d0b2-057a-40bf-a0ff-4907b00a285c',
            },
            expression:
              'kibana\n| selectFilter\n| demodata\n| markdown \n  "Donec vel sollicitudin mauris, ut scelerisque urna. Sed vel neque quis metus vulputate luctus." \n  font={font family="\'Open Sans\', Helvetica, Arial, sans-serif" size=18 align="center" color="#000000" weight="normal" underline=false italic=false}\n| render css=".canvasRenderEl p {\ncolor: #FFFFFF;\nopacity: .8;\nfont-size: 18px;\n}"',
          },
          {
            id: 'element-9b667060-18ba-4f4d-84a2-48adff57efac',
            position: {
              left: 537,
              top: 236,
              width: 200,
              height: 133,
              angle: 0,
              parent: 'group-1303d0b2-057a-40bf-a0ff-4907b00a285c',
            },
            expression:
              'kibana\n| selectFilter\n| demodata\n| math "unique(country)"\n| metric "Countries" \n  metricFont={font family="Futura, Impact, Helvetica, Arial, sans-serif" size=72 align="center" color="#45bdb0" weight="bold" underline=false italic=false} \n  labelFont={font family="Futura, Impact, Helvetica, Arial, sans-serif" size=24 align="center" color="#45bdb0" weight="normal" underline=false italic=false}\n| render css=".canvasRenderEl .canvasMetric__metric {\nmargin-bottom: 32px;\n}"',
          },
          {
            id: 'element-23fcecca-1f6a-44f6-b441-0f65e03d8210',
            position: {
              left: 163,
              top: 235.5,
              width: 200,
              height: 133,
              angle: 0,
              parent: 'group-1303d0b2-057a-40bf-a0ff-4907b00a285c',
            },
            expression:
              'kibana\n| selectFilter\n| demodata\n| math "unique(username)"\n| metric "Customers" \n  metricFont={font family="Futura, Impact, Helvetica, Arial, sans-serif" size=72 align="center" color="#45bdb0" weight="bold" underline=false italic=false} \n  labelFont={font family="Futura, Impact, Helvetica, Arial, sans-serif" size=24 align="center" color="#45bdb0" weight="normal" underline=false italic=false}\n| render css=".canvasRenderEl .canvasMetric__metric {\nmargin-bottom: 32px;\n}"',
          },
          {
            id: 'element-19f1db84-7a46-4ccb-a6b9-afd6ddd68523',
            position: {
              left: 129,
              top: 377.5,
              width: 270,
              height: 125,
              angle: 0,
              parent: 'group-1303d0b2-057a-40bf-a0ff-4907b00a285c',
            },
            expression:
              'kibana\n| selectFilter\n| demodata\n| markdown \n  "Donec vel sollicitudin mauris, ut scelerisque urna. Sed vel neque quis metus vulputate luctus." \n  font={font family="\'Open Sans\', Helvetica, Arial, sans-serif" size=18 align="center" color="#000000" weight="normal" underline=false italic=false}\n| render css=".canvasRenderEl p {\ncolor: #FFFFFF;\nopacity: .8;\nfont-size: 18px;\n}"',
          },
        ],
        groups: [],
      },
      {
        id: 'page-fd7a8984-0f73-4be8-9586-7a08e5f229d0',
        style: {
          background: '#FFF',
        },
        transition: {},
        elements: [
          {
            id: 'element-408b0a9d-f75d-4717-b6f7-79769774780c',
            position: {
              left: 73,
              top: 232,
              width: 679,
              height: 197.5,
              angle: 0,
              parent: null,
            },
            expression:
              'kibana\n| selectFilter\n| demodata\n| markdown "## An alternative opening title slide."\n| render css=".canvasRenderEl h2 {\nfont-size: 64px;\n}"',
          },
          {
            id: 'element-433586c1-4d44-40cf-988e-cf51871248fb',
            position: {
              left: 72,
              top: 57.5,
              width: 80,
              height: 75,
              angle: 0,
              parent: null,
            },
            expression:
              'image dataurl={asset "asset-aa91a324-8012-477e-a7e4-7c3cd7a6332f"} mode="contain"\n| render',
          },
          {
            id: 'element-5ceafd32-bed6-48c5-b980-b86bca879ba8',
            position: {
              left: 73,
              top: 429.5,
              width: 679,
              height: 49,
              angle: 0,
              parent: null,
            },
            expression:
              'kibana\n| selectFilter\n| demodata\n| markdown "### Subtitle goes here"\n| render css=".canvasRenderEl h3 {\ncolor: #45bdb0;\ntext-transform: none;\n}"',
          },
        ],
        groups: [],
      },
    ],
    colors: [
      '#37988d',
      '#c19628',
      '#b83c6f',
      '#3f9939',
      '#1785b0',
      '#ca5f35',
      '#45bdb0',
      '#f2bc33',
      '#e74b8b',
      '#4fbf48',
      '#1ea6dc',
      '#fd7643',
      '#72cec3',
      '#f5cc5d',
      '#ec77a8',
      '#7acf74',
      '#4cbce4',
      '#fd986f',
      '#a1ded7',
      '#f8dd91',
      '#f2a4c5',
      '#a6dfa2',
      '#86d2ed',
      '#fdba9f',
      '#000000',
      '#444444',
      '#777777',
      '#BBBBBB',
      '#FFFFFF',
      'rgba(255,255,255,0)',
    ],
    '@timestamp': '2019-04-30T20:34:38.471Z',
    '@created': '2019-04-30T20:29:21.649Z',
    assets: {
      'asset-a30a06eb-2276-44b1-a62d-856e2116138c': {
        id: 'asset-a30a06eb-2276-44b1-a62d-856e2116138c',
        '@created': '2019-03-29T14:02:51.349Z',
        type: 'dataurl',
        value: embed('a30a06eb-2276-44b1-a62d-856e2116138c.jpg'),
      },
      'asset-23edd689-2d34-4bb8-a3eb-05420dd87b85': {
        id: 'asset-23edd689-2d34-4bb8-a3eb-05420dd87b85',
        '@created': '2019-03-29T14:43:08.655Z',
        type: 'dataurl',
        value: embed('23edd689-2d34-4bb8-a3eb-05420dd87b85.svg'),
      },
      'asset-048ed81e-84ae-4a48-9c30-641cf72b0376': {
        id: 'asset-048ed81e-84ae-4a48-9c30-641cf72b0376',
        '@created': '2019-03-29T14:51:06.870Z',
        type: 'dataurl',
        value: embed('048ed81e-84ae-4a48-9c30-641cf72b0376.jpg'),
      },
      'asset-aa91a324-8012-477e-a7e4-7c3cd7a6332f': {
        id: 'asset-aa91a324-8012-477e-a7e4-7c3cd7a6332f',
        '@created': '2019-03-29T15:13:45.105Z',
        type: 'dataurl',
        value: embed('aa91a324-8012-477e-a7e4-7c3cd7a6332f.svg'),
      },
      'asset-0c6f377f-771e-432e-8e2e-15c3e9142ad6': {
        id: 'asset-0c6f377f-771e-432e-8e2e-15c3e9142ad6',
        '@created': '2019-03-29T15:23:05.562Z',
        type: 'dataurl',
        value: embed('0c6f377f-771e-432e-8e2e-15c3e9142ad6.png'),
      },
      'asset-9c2e5ab5-2dbe-43a8-bc84-e67f191fbcd8': {
        id: 'asset-9c2e5ab5-2dbe-43a8-bc84-e67f191fbcd8',
        '@created': '2019-03-29T15:23:05.713Z',
        type: 'dataurl',
        value: embed('9c2e5ab5-2dbe-43a8-bc84-e67f191fbcd8.png'),
      },
      'asset-6fb8f925-0e1e-4108-8442-3dbf88d145e5': {
        id: 'asset-6fb8f925-0e1e-4108-8442-3dbf88d145e5',
        '@created': '2019-03-29T15:36:01.954Z',
        type: 'dataurl',
        value: embed('6fb8f925-0e1e-4108-8442-3dbf88d145e5.jpg'),
      },
      'asset-d38c5025-eafc-4a35-a5fd-fb7b5bdc9efa': {
        id: 'asset-d38c5025-eafc-4a35-a5fd-fb7b5bdc9efa',
        '@created': '2019-03-29T15:55:34.064Z',
        type: 'dataurl',
        value: embed('d38c5025-eafc-4a35-a5fd-fb7b5bdc9efa.jpg'),
      },
      'asset-b22b6fa7-618c-4a59-82a1-ca921454da48': {
        id: 'asset-b22b6fa7-618c-4a59-82a1-ca921454da48',
        '@created': '2019-03-29T16:12:07.459Z',
        type: 'dataurl',
        value: embed('b22b6fa7-618c-4a59-82a1-ca921454da48.svg'),
      },
      'asset-7f2d5d96-3c85-49a0-94f3-e9b05de23cb6': {
        id: 'asset-7f2d5d96-3c85-49a0-94f3-e9b05de23cb6',
        '@created': '2019-03-29T19:55:47.705Z',
        type: 'dataurl',
        value: embed('7f2d5d96-3c85-49a0-94f3-e9b05de23cb6.jpg'),
      },
      'asset-0791ed56-9a2e-4d0d-8d2d-a2f8c3c268ee': {
        id: 'asset-0791ed56-9a2e-4d0d-8d2d-a2f8c3c268ee',
        '@created': '2019-03-29T19:55:47.974Z',
        type: 'dataurl',
        value: embed('0791ed56-9a2e-4d0d-8d2d-a2f8c3c268ee.jpg'),
      },
    },
    css: ".canvasPage h1, .canvasPage h2, .canvasPage h3, .canvasPage h4, .canvasPage h5 {\nfont-family: 'Futura';\ncolor: #444444;\n}\n\n.canvasPage h1 {\nfont-size: 112px;\nfont-weight: bold;\ncolor: #FFFFFF;\n}\n\n.canvasPage h2 {\nfont-size: 48px;\nfont-weight: bold;\n}\n\n.canvasPage h3 {\nfont-size: 30px;\nfont-weight: 300;\ntext-transform: uppercase;\ncolor: #FFFFFF;\n}\n\n.canvasPage h5 {\nfont-size: 24px;\nfont-style: italic;\n}",
    variables: [],
  },
};
