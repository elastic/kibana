def loadIngestionPipeline(ingestionPipelineName, title) {
  kibanaPipeline.bash("""
    source src/dev/ci_setup/setup_env.sh true
    yarn kbn bootstrap --prefer-offline

    . src/dev/code_coverage/shell_scripts/assign_teams.sh '${ingestionPipelineName}'
  """, title)
}

def loadWithVault(ingestionPipelineName, title) {
  def vaultSecret = 'secret/kibana-issues/prod/coverage/elasticsearch'
  withVaultSecret(secret: vaultSecret, secret_field: 'host', variable_name: 'HOST_FROM_VAULT') {
    withVaultSecret(secret: vaultSecret, secret_field: 'username', variable_name: 'USER_FROM_VAULT') {
      withVaultSecret(secret: vaultSecret, secret_field: 'password', variable_name: 'PASS_FROM_VAULT') {
        loadIngestionPipeline(ingestionPipelineName, title)
      }
    }
  }
}

def load(ingestionPipelineName, title) {
  loadWithVault(ingestionPipelineName, title)
}

return this
