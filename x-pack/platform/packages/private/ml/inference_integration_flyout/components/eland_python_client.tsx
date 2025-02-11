/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiSteps,
  EuiText,
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiLink,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
export const ElandPythonClient: React.FC<{
  supportedNlpModels: string;
  nlpImportModel: string;
}> = ({ supportedNlpModels, nlpImportModel }) => {
  return (
    <>
      <EuiSpacer size={'m'} />
      <EuiSteps
        steps={[
          {
            title: i18n.translate('xpack.ml.addInferenceEndpoint.elandPythonClient.step1Title', {
              defaultMessage: 'Install the Eland Python Client',
            }),
            children: (
              <EuiText>
                <EuiText size={'s'} color={'subdued'}>
                  <FormattedMessage
                    id="xpack.ml.addInferenceEndpoint.elandPythonClient.pipInstallLabel"
                    defaultMessage="Eland can be installed with {pipLink} from {pypiLink}:"
                    values={{
                      pipLink: (
                        <EuiLink href={'https://pypi.org/project/pip/'} target={'_blank'} external>
                          pip
                        </EuiLink>
                      ),
                      pypiLink: (
                        <EuiLink href={'https://pypi.org/'} target={'_blank'} external>
                          PyPI
                        </EuiLink>
                      ),
                    }}
                  />
                </EuiText>

                <EuiCodeBlock
                  isCopyable
                  language="shell"
                  fontSize={'m'}
                  data-test-subj={'mlElandPipInstallCodeBlock'}
                >
                  <p>$ python -m pip install eland</p>
                </EuiCodeBlock>

                <EuiText size={'s'} color={'subdued'}>
                  <FormattedMessage
                    id="xpack.ml.addInferenceEndpoint.elandPythonClient.condaInstallLabel"
                    defaultMessage="or it can also be installed with {condaLink} from {condaForgeLink}:"
                    values={{
                      condaLink: (
                        <EuiLink href={'https://docs.conda.io/'} target={'_blank'} external>
                          Conda
                        </EuiLink>
                      ),
                      condaForgeLink: (
                        <EuiLink href={'https://conda-forge.org/'} target={'_blank'} external>
                          Conda Forge
                        </EuiLink>
                      ),
                    }}
                  />
                </EuiText>

                <EuiCodeBlock
                  isCopyable
                  language="shell"
                  fontSize={'m'}
                  data-test-subj="mlElandCondaInstallCodeBlock"
                >
                  <p> $ conda install -c conda-forge eland</p>
                </EuiCodeBlock>
              </EuiText>
            ),
          },
          {
            title: i18n.translate('xpack.ml.addInferenceEndpoint.elandPythonClient.step2Title', {
              defaultMessage: 'Importing your third-party model',
            }),
            children: (
              <EuiText>
                <p>
                  <EuiText size={'s'} color={'subdued'}>
                    <FormattedMessage
                      id="xpack.ml.addInferenceEndpoint.elandPythonClient.step2Body"
                      defaultMessage="Follow the instructions on importing compatible third-party models"
                    />
                  </EuiText>
                </p>

                <p>
                  <b>
                    <FormattedMessage
                      id="xpack.ml.addInferenceEndpoint.elandPythonClient.step2ExampleTitle"
                      defaultMessage="Example import"
                    />
                  </b>

                  <EuiCodeBlock
                    isCopyable
                    language="shell"
                    fontSize={'m'}
                    data-test-subj={'mlElandExampleImportCodeBlock'}
                  >
                    eland_import_hub_model <br />
                    --cloud-id &lt;cloud-id&gt; \ <br />
                    -u &lt;username&gt; -p &lt;password&gt; \ <br />
                    --hub-model-id &lt;model-id&gt; \ <br />
                    --task-type ner \
                  </EuiCodeBlock>
                </p>

                <EuiFlexGroup gutterSize={'s'}>
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty href={nlpImportModel} target={'_blank'} iconType={'help'}>
                      <FormattedMessage
                        id="xpack.ml.addInferenceEndpoint.elandPythonClient.importModelButtonLabel"
                        defaultMessage="Import models with Eland"
                      />
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty href={supportedNlpModels} target={'_blank'} iconType={'help'}>
                      <FormattedMessage
                        id="xpack.ml.addInferenceEndpoint.elandPythonClient.compatibleModelsButtonLabel"
                        defaultMessage="Compatible NLP models"
                      />
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiText>
            ),
          },
          {
            title: i18n.translate('xpack.ml.addInferenceEndpoint.elandPythonClient.step4Title', {
              defaultMessage: 'Deploy your model',
            }),
            children: (
              <>
                <EuiText size={'s'} color={'subdued'}>
                  <p>
                    <FormattedMessage
                      id="xpack.ml.addInferenceEndpoint.elandPythonClient.step4Body"
                      defaultMessage="Click “Start deployment” in the table row containing your new model to deploy and use it."
                    />
                  </p>
                </EuiText>
                <EuiSpacer size="m" />
                <EuiText size="s" color={'subdued'}>
                  <p>
                    <FormattedMessage
                      id="xpack.ml.addInferenceEndpoint.elandPythonClient.step3Body"
                      defaultMessage="Note: The trained model list automatically refreshes with the most current imported models in your cluster. If the list is not updated, click the 'Refresh' button in the top right corner. Otherwise, revisit the instructions above to troubleshoot."
                    />
                  </p>
                </EuiText>
              </>
            ),
          },
        ]}
      />
    </>
  );
};
