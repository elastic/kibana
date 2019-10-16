/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface Snippet {
  uri: string;
  filePath: string;
  language?: string;
  compositeContent: {
    content: string;
    lineMapping: string[];
  };
}

export type Results = Record<string, Snippet>;

export const results: Results = {
  'user.ts#L15': {
    uri: 'github.com/Microsoft/Typescript-Node-Starter',
    filePath: 'src/controllers/user.ts',
    language: 'typescript',
    compositeContent: {
      content:
        '\nimport nodemailer from "nodemailer";\nimport passport from "passport";\nimport { User, UserDocument, AuthToken } from "../models/User";\nimport { Request, Response, NextFunction } from "express";\nimport { IVerifyOptions } from "passport-local";\n\n */\nexport const getLogin = (req: Request, res: Response) => {\n    if (req.user) {\n        return res.redirect("/");\n    }\n\n    }\n\n    passport.authenticate("local", (err: Error, user: UserDocument, info: IVerifyOptions) => {\n        if (err) { return next(err); }\n        if (!user) {\n',
      lineMapping: [
        '..',
        '3',
        '4',
        '5',
        '6',
        '7',
        '..',
        '15',
        '16',
        '17',
        '18',
        '19',
        '..',
        '40',
        '41',
        '42',
        '43',
        '44',
        '..',
      ],
    },
  },
  'User.ts#L8': {
    uri: 'github.com/Microsoft/Typescript-Node-Starter',
    filePath: 'src/models/User.ts',
    language: 'typescript',
    compositeContent: {
      content:
        '\nimport mongoose from "mongoose";\n\nexport type UserDocument = mongoose.Document & {\n    email: string;\n    password: string;\n\n}\n\nconst userSchema = new mongoose.Schema({\n    email: { type: String, unique: true },\n    password: String,\n\n * Password hash middleware.\n */\nuserSchema.pre("save", function save(next) {\n    const user = this as UserDocument;\n    if (!user.isModified("password")) { return next(); }\n    bcrypt.genSalt(10, (err, salt) => {\n',
      lineMapping: [
        '..',
        '3',
        '4',
        '5',
        '6',
        '7',
        '..',
        '31',
        '32',
        '33',
        '34',
        '35',
        '..',
        '54',
        '55',
        '56',
        '57',
        '58',
        '59',
        '..',
      ],
    },
  },
  'passport.ts#L10': {
    uri: 'github.com/Microsoft/Typescript-Node-Starter',
    filePath: 'src/config/passport.ts',
    language: 'typescript',
    compositeContent: {
      content:
        '\nimport _ from "lodash";\n\n// import { User, UserType } from \'../models/User\';\nimport { User, UserDocument } from "../models/User";\nimport { Request, Response, NextFunction } from "express";\n\n',
      lineMapping: ['..', '4', '5', '6', '7', '8', '9', '..'],
    },
  },
  'user.test.ts#L3': {
    uri: 'github.com/Microsoft/Typescript-Node-Starter',
    filePath: 'test/user.test.ts',
    language: 'typescript',
    compositeContent: {
      content:
        'import request from "supertest";\nimport app from "../src/app";\nimport { expect } from "chai";\n',
      lineMapping: ['1', '2', '3', '..'],
    },
  },
  'app.ts#L60': {
    uri: 'github.com/Microsoft/Typescript-Node-Starter',
    filePath: 'src/app.ts',
    language: 'typescript',
    compositeContent: {
      content:
        '\n// Controllers (route handlers)\nimport * as homeController from "./controllers/home";\nimport * as userController from "./controllers/user";\nimport * as apiController from "./controllers/api";\nimport * as contactController from "./controllers/contact";\n\napp.use(lusca.xssProtection(true));\napp.use((req, res, next) => {\n    res.locals.user = req.user;\n    next();\n});\napp.use((req, res, next) => {\n    // After successful login, redirect back to the intended page\n    if (!req.user &&\n    req.path !== "/login" &&\n    req.path !== "/signup" &&\n',
      lineMapping: [
        '..',
        '16',
        '17',
        '18',
        '19',
        '20',
        '..',
        '60',
        '61',
        '62',
        '63',
        '64',
        '65',
        '66',
        '67',
        '68',
        '69',
        '..',
      ],
    },
  },
};

export interface Frame {
  fileName: string;
  lineNumber: number;
  functionName?: string;
}

export const frames: Frame[] = [
  { fileName: 'user.ts', lineNumber: 15 },
  { fileName: 'user.ts', lineNumber: 25 },
  { fileName: 'User.ts', lineNumber: 8 },
  { fileName: 'passport.ts', lineNumber: 10 },
  { fileName: 'app.ts', lineNumber: 60 },
  { fileName: 'app.ts', lineNumber: 2 },
  { fileName: 'user.test.ts', lineNumber: 18 },
  { fileName: 'user.test.ts', lineNumber: 3 },
];

export const repos = [
  'https://github.com/a/repo',
  'https://github.com/another/repo',
  'https://github.com/also/a_repo',
];
